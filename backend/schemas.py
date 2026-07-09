from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json

class VagaCreate(BaseModel):
    titulo: str
    descricao: str
    palavras_chave: Optional[str] = None

class VagaResponse(BaseModel):
    id: int
    titulo: str
    descricao: str
    palavras_chave: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class VagaStatsResponse(VagaResponse):
    total_candidatos: int = 0
    analises_pendentes: int = 0

class CandidatoResponse(BaseModel):
    id: int
    vaga_id: int
    filename: str
    status: str
    score: Optional[int] = None
    json_result: Optional[str] = None
    error_message: Optional[str] = None
    nome_candidato: Optional[str] = None
    info_removida: Optional[str] = None
    alertas_vies: Optional[str] = None
    score_revisado: Optional[int] = None
    comentarios_revisores: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CandidatoRevisaoUpdate(BaseModel):
    score_revisado: Optional[int] = None
    comentarios_revisores: Optional[str] = None
