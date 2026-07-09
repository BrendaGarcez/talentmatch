from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Vaga(Base):
    __tablename__ = "vagas"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, index=True)
    descricao = Column(Text)
    palavras_chave = Column(String, nullable=True) # Ex: "Python, FastAPI, AWS"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relacionamento 1-N (Uma vaga tem muitos candidatos)
    candidatos = relationship("Candidato", back_populates="vaga", cascade="all, delete-orphan")


class Candidato(Base):
    __tablename__ = "candidatos"

    id = Column(Integer, primary_key=True, index=True)
    vaga_id = Column(Integer, ForeignKey("vagas.id"))
    filename = Column(String)
    
    status = Column(String, default="Pendente") # Pendente, Concluido, Erro
    score = Column(Integer, nullable=True)      # Nota calculada pelo IA
    json_result = Column(Text, nullable=True)   # O Objeto cru devolvido pelo gemini em formato String
    error_message = Column(Text, nullable=True) # Em caso de falha de conexão

    nome_candidato = Column(String, nullable=True) # Nome extraído do currículo
    info_removida = Column(Text, nullable=True)    # JSON string dos dados sensíveis removidos
    alertas_vies = Column(Text, nullable=True)     # JSON string com os alertas gerados pela IA

    score_revisado = Column(Integer, nullable=True)
    comentarios_revisores = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    vaga = relationship("Vaga", back_populates="candidatos")
