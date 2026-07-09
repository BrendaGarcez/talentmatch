from fastapi import FastAPI, UploadFile, File, Form, Depends, BackgroundTasks, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import shutil
import os
import json
import threading
from dotenv import load_dotenv

from database import engine, Base, get_db
import models
import schemas
from engine import extrair_texto_pdf, analisar_com_gemini, analisar_com_gemini_multimodal
from anonymizer import anonimizar_curriculo

load_dotenv()

# Cria o banco de dados na hora se ainda não existir
Base.metadata.create_all(bind=engine)

# Lock para processar um currículo por vez (evita queda por limite de API)
ai_lock = threading.Lock()

app = FastAPI()

if not os.path.exists("uploads"):
    os.makedirs("uploads")

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------
# ROTAS PARA VAGAS
# -----------------
@app.post("/vagas", response_model=schemas.VagaResponse)
def criar_vaga(vaga: schemas.VagaCreate, db: Session = Depends(get_db)):
    nova_vaga = models.Vaga(
        titulo=vaga.titulo, 
        descricao=vaga.descricao,
        palavras_chave=vaga.palavras_chave
    )
    db.add(nova_vaga)
    db.commit()
    db.refresh(nova_vaga)
    return nova_vaga

@app.get("/vagas", response_model=list[schemas.VagaStatsResponse])
def listar_vagas(db: Session = Depends(get_db)):
    vagas = db.query(models.Vaga).order_by(models.Vaga.created_at.desc()).all()
    resultado = []
    for v in vagas:
        total = len(v.candidatos)
        pendentes = sum(1 for c in v.candidatos if c.status == "Pendente")
        v_dict = v.__dict__.copy()
        v_dict["total_candidatos"] = total
        v_dict["analises_pendentes"] = pendentes
        resultado.append(v_dict)
    return resultado

@app.get("/vagas/{vaga_id}", response_model=schemas.VagaResponse)
def obter_vaga(vaga_id: int, db: Session = Depends(get_db)):
    vaga = db.query(models.Vaga).filter(models.Vaga.id == vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    return vaga


# -----------------
# WORKER BACKGROUND
# -----------------
def processar_curriculo_background(candidato_id: int, temp_path: str, job_description: str, palavras_chave: str = None):
    # Garantir que apenas um processamento ocorra por vez (Fila Síncrona)
    with ai_lock:
        from database import SessionLocal
        db = SessionLocal()
        candidato = db.query(models.Candidato).filter(models.Candidato.id == candidato_id).first()
        
        if not candidato:
            db.close()
            return

        try:
            # Extração de texto
            texto_bruto = extrair_texto_pdf(temp_path)
            
            # LGPD: Anonimização com Tags antes de enviar para a IA
            # Isso protege os dados sensíveis mas mantém o contexto para a análise
            from anonymizer import anonimizar_curriculo
            texto_para_ia, info_removida = anonimizar_curriculo(texto_bruto)

            # Lógica de Fallback: Se o PDF for imagem/scaneado (texto muito curto ou vazio)
            if len(texto_bruto.strip()) < 50:
                print(f"Fallback Multimodal para candidato {candidato_id}: PDF parece ser imagem.")
                # No multimodal (imagem), enviamos o arquivo original. 
                # (O ideal seria anonimizar a imagem, mas isso exige OCR avançado).
                resultado_str = analisar_com_gemini_multimodal(temp_path, job_description, palavras_chave)
                detalhes_processamento = {"metodo": "Visão Computacional (PDF scaneado)"}
            else:
                # Enviando texto anonimizado (com tags [CPF_PROTEGIDO], etc)
                resultado_str = analisar_com_gemini(texto_para_ia, job_description, palavras_chave)
                detalhes_processamento = {"metodo": "Extração de Texto com Anonimização LGPD"}
            
            # Mesclar info de anonimização com detalhes de processamento
            log_privacidade = {**detalhes_processamento, "dados_mascarados": list(info_removida.keys())}
            
            candidato.json_result = resultado_str
            candidato.info_removida = json.dumps(log_privacidade, ensure_ascii=False)
            
            # Tenta pegar a nota pra viabilizar o Ranking / OrderBy depois
            try:
                res_obj = json.loads(resultado_str)
                candidato.score = int(res_obj.get("score", 0))
                
                # Prioridade para o nome: IA (Gemini) > Anonimizador > Nome do Arquivo
                nome_ia = res_obj.get("nome_candidato")
                if nome_ia and "[CANDIDATO ANONIMIZADO]" not in nome_ia:
                    candidato.nome_candidato = nome_ia
                elif info_removida.get("nome_detectado"):
                    candidato.nome_candidato = info_removida.get("nome_detectado")

                if "alertas_vies" in res_obj:
                    candidato.alertas_vies = json.dumps(res_obj.get("alertas_vies"), ensure_ascii=False)
            except Exception as e:
                print("Aviso: Nao foi possivel extrair metadados do JSON", e)

            candidato.status = "Concluido"
        except Exception as e:
            candidato.status = "Erro"
            candidato.error_message = str(e)
        finally:
            db.commit()
            db.close()
            # Mantendo o PDF para visualização no dashboard (MVP)
            # if os.path.exists(temp_path):
            #     os.remove(temp_path)
            pass


# -----------------
# UPLOAD MULTIPLO E RANKING
# -----------------
@app.post("/vagas/{vaga_id}/upload")
async def upload_candidato_para_vaga(
    vaga_id: int, 
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    vaga = db.query(models.Vaga).filter(models.Vaga.id == vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    # Inserir no banco de dados como pendente imediatamente
    candidato = models.Candidato(vaga_id=vaga.id, filename=file.filename, status="Pendente")
    db.add(candidato)
    db.commit()
    db.refresh(candidato)

    # Salvar em disco permanentemente para o visualizador
    os.makedirs("uploads", exist_ok=True)
    # Usamos apenas o ID para o nome do arquivo final ficar limpo
    temp_path = os.path.join("uploads", f"{candidato.id}.pdf")
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Disparar Background Task e liberar a interface
    background_tasks.add_task(processar_curriculo_background, candidato.id, temp_path, vaga.descricao, vaga.palavras_chave)

    return {"message": "Upload recebido! Processando na IA em segundo plano...", "candidato_id": candidato.id}


@app.get("/vagas/{vaga_id}/candidatos", response_model=list[schemas.CandidatoResponse])
def listar_candidatos_rankeados(vaga_id: int, db: Session = Depends(get_db)):
    # Retorna classificado pela maior nota de inteligencia primeiro (Ranking)
    candidatos = db.query(models.Candidato)\
        .filter(models.Candidato.vaga_id == vaga_id)\
        .order_by(models.Candidato.score.desc())\
        .all()
    return candidatos


# -----------------
# ROTAS DE DELEÇÃO
# -----------------
@app.delete("/vagas/batch")
def deletar_vagas_batch(ids: list[int], db: Session = Depends(get_db)):
    vagas = db.query(models.Vaga).filter(models.Vaga.id.in_(ids)).all()
    
    for v in vagas:
        # Apagar arquivos físicos dos candidatos desta vaga
        for c in v.candidatos:
            file_path = os.path.join("uploads", f"{c.id}.pdf")
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Erro ao apagar arquivo {file_path}: {e}")
        db.delete(v)
    
    db.commit()
    return {"message": f"{len(vagas)} vagas e seus arquivos associados foram excluídos"}

@app.delete("/vagas/{vaga_id}")
def deletar_vaga(vaga_id: int, db: Session = Depends(get_db)):
    vaga = db.query(models.Vaga).filter(models.Vaga.id == vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    # Apagar arquivos físicos dos candidatos desta vaga
    for c in vaga.candidatos:
        file_path = os.path.join("uploads", f"{c.id}.pdf")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Erro ao apagar arquivo {file_path}: {e}")

    db.delete(vaga)
    db.commit()
    return {"message": "Vaga e arquivos associados deletados com sucesso"}

@app.post("/candidatos/{candidato_id}/reprocessar")
def reprocessar_candidato(candidato_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    candidato = db.query(models.Candidato).filter(models.Candidato.id == candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    vaga = db.query(models.Vaga).filter(models.Vaga.id == candidato.vaga_id).first()
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga associada não encontrada")

    file_path = os.path.join("uploads", f"{candidato.id}.pdf")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo original não encontrado no servidor. Por favor, faça o upload novamente.")

    # Resetar status e dados
    candidato.status = "Pendente"
    candidato.error_message = None
    candidato.score = 0
    db.commit()

    # Disparar a IA novamente usando o arquivo que já existe
    background_tasks.add_task(processar_curriculo_background, candidato.id, file_path, vaga.descricao, vaga.palavras_chave)

    return {"message": "Reanálise iniciada!"}

@app.delete("/candidatos/batch")
def deletar_candidatos_batch(ids: list[int], db: Session = Depends(get_db)):
    candidatos = db.query(models.Candidato).filter(models.Candidato.id.in_(ids)).all()
    
    for c in candidatos:
        # Apagar arquivo físico
        file_path = os.path.join("uploads", f"{c.id}.pdf")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Erro ao apagar arquivo {file_path}: {e}")
        db.delete(c)
    
    db.commit()
    return {"message": f"{len(candidatos)} candidatos e seus arquivos foram excluídos"}

@app.delete("/candidatos/{candidato_id}")
def deletar_candidato(candidato_id: int, db: Session = Depends(get_db)):
    candidato = db.query(models.Candidato).filter(models.Candidato.id == candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    # Apagar arquivo físico
    file_path = os.path.join("uploads", f"{candidato.id}.pdf")
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Erro ao apagar arquivo {file_path}: {e}")

    db.delete(candidato)
    db.commit()
    return {"message": "Candidato e arquivo deletados com sucesso"}

# -----------------
# ROTAS DE CONFORMIDADE LGPD (DOWNLOAD SEGURO E REVISÃO HUMANA)
# -----------------
@app.get("/candidatos/{candidato_id}/pdf")
def obter_candidato_pdf(candidato_id: int, db: Session = Depends(get_db)):
    candidato = db.query(models.Candidato).filter(models.Candidato.id == candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    file_path = os.path.join("uploads", f"{candidato.id}.pdf")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo PDF não encontrado no servidor")
    
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=candidato.filename,
        content_disposition_type="inline"
    )

@app.put("/candidatos/{candidato_id}/revisar", response_model=schemas.CandidatoResponse)
def revisar_candidato(
    candidato_id: int, 
    revisao: schemas.CandidatoRevisaoUpdate, 
    db: Session = Depends(get_db)
):
    candidato = db.query(models.Candidato).filter(models.Candidato.id == candidato_id).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato não encontrado")
    
    candidato.score_revisado = revisao.score_revisado
    candidato.comentarios_revisores = revisao.comentarios_revisores
    db.commit()
    db.refresh(candidato)
    return candidato
