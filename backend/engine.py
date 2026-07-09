import pdfplumber
import google.generativeai as genai
import os
import time
from prompt_templates import SYSTEM_PROMPT

def extrair_texto_pdf(file_path):
    with pdfplumber.open(file_path) as pdf:
        return "".join([page.extract_text() for page in pdf.pages])

def analisar_com_gemini(texto_curriculo, job_description, palavras_chave=None):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"{SYSTEM_PROMPT}\n\nVaga: {job_description}\n"
    if palavras_chave:
        prompt += f"Palavras-Chave Esperadas: {palavras_chave}\n"
    prompt += f"\nCurrículo: {texto_curriculo}"
    # Retry logic para evitar Rate Limit
    for tentativa in range(3):
        try:
            response = model.generate_content(prompt)
            texto_limpo = response.text.replace("```json", "").replace("```", "").strip()
            return texto_limpo
        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower():
                print(f"Rate Limit atingido. Tentativa {tentativa+1}/3. Esperando 5s...")
                time.sleep(5)
                continue
            raise e
    raise Exception("Limite de API do Google excedido após 3 tentativas. Tente novamente mais tarde.")

def analisar_com_gemini_multimodal(file_path, job_description, palavras_chave=None):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-2.5-flash')

    # Lendo os bytes diretamente para evitar erro de leitura/upload
    with open(file_path, "rb") as f:
        doc_data = f.read()
    
    mime_type = "application/pdf" if file_path.lower().endswith(".pdf") else "image/jpeg"
    
    prompt_ocr_anon = (
        "Você é um assistente especializado em conformidade com a LGPD e OCR.\n"
        "Transcreva todo o texto contido no documento em anexo. No entanto, para garantir a privacidade dos dados "
        "do candidato, substitua obrigatoriamente todas as informações pessoais identificáveis pelas seguintes tags:\n"
        "- Nome completo do candidato -> [CANDIDATO ANONIMIZADO]\n"
        "- E-mail -> [EMAIL_PROTEGIDO]\n"
        "- Telefone -> [TELEFONE_PROTEGIDO]\n"
        "- CPF -> [CPF_PROTEGIDO]\n"
        "- RG -> [RG_PROTEGIDO]\n"
        "- Endereço residencial e CEP -> [ENDEREÇO_PROTEGIDO]\n"
        "- Data de nascimento e idade -> [DATA_PROTEGIDA]\n"
        "- Links de redes sociais ou portfólios (LinkedIn, GitHub, etc.) -> [URL_PROTEGIDA]\n\n"
        "Retorne APENAS o texto transcrito e devidamente mascarado, sem nenhuma explicação ou introdução."
    )

    texto_anonimo = None
    for tentativa in range(3):
        try:
            response = model.generate_content([
                {'mime_type': mime_type, 'data': doc_data},
                prompt_ocr_anon
            ])
            texto_anonimo = response.text.strip()
            if texto_anonimo:
                break
        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower():
                print(f"Rate Limit atingido (OCR Multimodal). Tentativa {tentativa+1}/3. Esperando 7s...")
                time.sleep(7)
                continue
            raise e
            
    if not texto_anonimo:
        raise Exception("Não foi possível transcrever e anonimizar o documento via OCR Multimodal. Limite de API excedido.")

    return analisar_com_gemini(texto_anonimo, job_description, palavras_chave)
