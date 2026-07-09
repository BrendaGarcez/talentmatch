import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, Database, Trash2, X, Briefcase, Filter, ChevronDown, ChevronUp, FileText, Download, Check, User } from 'lucide-react';
import api from '../services/api';
import FileUpload from '../components/FileUpload';
import AnalysisCard from '../components/AnalysisCard';

export default function DashboardVagaPage() {
  const { id } = useParams();
  const [candidatos, setCandidatos] = useState([]);
  const [vaga, setVaga] = useState(null);
  const [selectedJson, setSelectedJson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' ou 'asc'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemParaDeletar, setItemParaDeletar] = useState(null);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedCandidato, setSelectedCandidato] = useState(null);
  const [revisedScore, setRevisedScore] = useState('');
  const [revisedComments, setRevisedComments] = useState('');
  const [savingRevision, setSavingRevision] = useState(false);
  const [notification, setNotification] = useState(null);
  const itemsPerPage = 8;

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const fetchCandidatos = async () => {
    try {
      setLoading(true);
      const resp = await api.get(`/vagas/${id}/candidatos`);
      setCandidatos(resp.data);
    } catch (e) {
      console.error("Erro ao buscar candidatos:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCandidato = (e, candidato) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setItemParaDeletar(candidato);
  };

  const confirmarDelecao = async () => {
    if (!itemParaDeletar) return;
    try {
      await api.delete(`/candidatos/${itemParaDeletar.id}`);
      await fetchCandidatos();
      setItemParaDeletar(null);
      showNotification('Candidato excluído com sucesso!', 'success');
    } catch (error) {
      console.error("Erro ao excluir candidato:", error);
      showNotification('Erro ao excluir candidato', 'error');
    }
  };

  const handleReprocessar = async (id) => {
    try {
      await api.post(`/candidatos/${id}/reprocessar`);
      fetchCandidatos(); // Atualiza a lista para mostrar o status "Pendente"
      showNotification('Reanálise iniciada com sucesso!', 'success');
    } catch (error) {
      console.error("Erro ao reprocessar:", error);
      showNotification(error.response?.data?.detail || 'Erro ao iniciar reanálise', 'error');
    }
  };

  const fetchVaga = async () => {
    try {
      const resp = await api.get(`/vagas/${id}`);
      setVaga(resp.data);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (!isSelectionMode === false) {
      setSelectedIds([]); // Limpa a seleção ao sair do modo
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      await api.delete('/candidatos/batch', { data: selectedIds });
      setSelectedIds([]);
      setIsSelectionMode(false);
      setShowBulkDeleteModal(false);
      fetchCandidatos();
      showNotification('Candidatos excluídos com sucesso!', 'success');
    } catch (error) {
      console.error("Erro na exclusão em lote:", error);
      showNotification('Erro ao excluir candidatos', 'error');
    }
  };

  const handleBulkDownload = () => {
    selectedIds.forEach((id, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = `${api.defaults.baseURL || 'http://localhost:8000'}/candidatos/${id}/pdf`;
        link.download = `curriculo_${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 300);
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === currentCandidatos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentCandidatos.map(c => c.id));
    }
  };

  const toggleSelectCandidate = (e, id) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  useEffect(() => {
    fetchCandidatos();
    fetchVaga();
  }, [id]);

  // Polling para atualizar automaticamente quando houver currículos processando
  useEffect(() => {
    let interval;
    const hasPending = candidatos.some(c => c.status === 'Pendente');

    if (hasPending) {
      interval = setInterval(() => {
        fetchCandidatos();
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [candidatos, id]);

  const handleCardClick = (candidato) => {
    if (candidato.status === 'Concluido' && candidato.json_result) {
      try {
        const obj = JSON.parse(candidato.json_result);
        let infoRemovida = null;
        try { if (candidato.info_removida) infoRemovida = JSON.parse(candidato.info_removida); } catch (e) { }
        setSelectedJson({
          ...obj,
          nome: candidato.nome_candidato || candidato.filename,
          info_removida: infoRemovida,
          id: candidato.id
        });
        setSelectedCandidato(candidato);
        setRevisedScore(candidato.score_revisado !== null ? candidato.score_revisado.toString() : candidato.score.toString());
        setRevisedComments(candidato.comentarios_revisores || '');
      } catch (e) {
        showNotification("Erro ao ler dados estruturados do candidato", "error");
      }
    }
  };

  const handleSaveRevision = async () => {
    if (revisedScore === '') return showNotification("Defina uma nota de revisão!", "error");
    const scoreNum = parseInt(revisedScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return showNotification("A nota deve ser um número entre 0 e 100!", "error");
    }

    try {
      setSavingRevision(true);
      const resp = await api.put(`/candidatos/${selectedCandidato.id}/revisar`, {
        score_revisado: scoreNum,
        comentarios_revisores: revisedComments
      });
      setSelectedCandidato(resp.data);
      setCandidatos(prev => prev.map(c => c.id === selectedCandidato.id ? resp.data : c));
      showNotification("Revisão humana salva com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showNotification("Erro ao salvar revisão.", "error");
    } finally {
      setSavingRevision(false);
    }
  };

  const handleRevertRevision = async () => {
    try {
      setSavingRevision(true);
      const resp = await api.put(`/candidatos/${selectedCandidato.id}/revisar`, {
        score_revisado: null,
        comentarios_revisores: null
      });
      setSelectedCandidato(resp.data);
      setCandidatos(prev => prev.map(c => c.id === selectedCandidato.id ? resp.data : c));
      setRevisedScore(selectedCandidato.score.toString());
      setRevisedComments('');
      showNotification("Decisão automatizada da IA restaurada!", "success");
    } catch (e) {
      console.error(e);
      showNotification("Erro ao restaurar nota.", "error");
    } finally {
      setSavingRevision(false);
    }
  };

  const filteredCandidatos = candidatos.filter(c => {
    if (!searchTerm) return true;
    if (c.status !== 'Concluido' || !c.json_result) return false;
    try {
      const obj = JSON.parse(c.json_result);
      const palavrasEncontradas = obj.palavras_chave_encontradas || [];
      const term = searchTerm.toLowerCase();
      return palavrasEncontradas.some(p => p.toLowerCase().includes(term));
    } catch (e) {
      return false;
    }
  });

  // Ordenação
  const sortedCandidatos = [...filteredCandidatos].sort((a, b) => {
    const scoreA = a.score_revisado !== null ? a.score_revisado : (a.score || 0);
    const scoreB = b.score_revisado !== null ? b.score_revisado : (b.score || 0);
    return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
  });

  // Paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCandidatos = sortedCandidatos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedCandidatos.length / itemsPerPage);

  // Resetar página quando o filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOrder]);

  const getScoreStyle = (c) => {
    if (c.status !== 'Concluido') return 'bg-gray-50 border-gray-100 cursor-not-allowed';
    const effectiveScore = c.score_revisado !== null ? c.score_revisado : c.score;
    if (effectiveScore >= 80) return 'bg-white border-green-100 hover:border-green-200 hover:shadow-card-hover cursor-pointer';
    if (effectiveScore >= 60) return 'bg-white border-yellow-100 hover:border-yellow-200 hover:shadow-card-hover cursor-pointer';
    return 'bg-white border-red-100 hover:border-red-200 hover:shadow-card-hover cursor-pointer';
  };

  const getScoreBadgeStyle = (score) => {
    if (score >= 80) return 'bg-green-50 text-green-700 border border-green-100';
    if (score >= 60) return 'bg-yellow-50 text-yellow-700 border border-yellow-100';
    return 'bg-red-50 text-red-700 border border-red-100';
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Breadcrumb */}
      <Link
        to="/"
        className="inline-flex items-center text-gray-500 hover:text-scifi_red transition-colors mb-8 text-sm font-medium gap-1.5"
      >
        <ArrowLeft size={16} /> Voltar ao Painel
      </Link>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Dashboard de <span className="text-scifi_red">Análise</span>
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">IA avaliando currículos em tempo real.</p>
        </div>
        <button
          onClick={fetchCandidatos}
          className="bg-white hover:bg-gray-50 text-gray-600 p-2.5 rounded-lg transition-colors border border-gray-100 shadow-sm hover:shadow-card"
          title="Atualizar"
        >
          <RefreshCw size={18} className={loading ? "animate-spin text-scifi_red" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna Esquerda */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          {/* Detalhes da Vaga */}
          {vaga && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
              <h4 className="text-gray-800 font-semibold mb-3 flex items-center gap-2 text-sm">
                <Briefcase size={16} className="text-scifi_red" /> Sobre a Vaga
              </h4>
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-bold text-gray-900">{vaga.titulo}</h5>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-5">{vaga.descricao}</p>
                </div>
                {vaga.palavras_chave && (
                  <div>
                    <span className="text-xs font-semibold text-gray-700 block mb-1.5">Palavras-chave:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {vaga.palavras_chave.split(',').map((kw, i) => (
                        <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium border border-gray-200">
                          {kw.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <FileUpload vagaId={id} onUploadSuccess={fetchCandidatos} showNotification={showNotification} />

          {/* Estatísticas */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h4 className="text-gray-800 font-semibold mb-4 flex items-center gap-2 text-sm">
              <Database size={16} className="text-scifi_red" /> Estatísticas da Fila
            </h4>
            <ul className="space-y-3">
              <li className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-gray-800">{candidatos.length}</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Concluídos</span>
                <span className="font-bold text-green-600">{candidatos.filter(c => c.status === 'Concluido').length}</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Pendentes</span>
                <span className="font-bold text-yellow-600 animate-pulse">{candidatos.filter(c => c.status === 'Pendente').length}</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Falhas</span>
                <span className="font-bold text-red-500">{candidatos.filter(c => c.status === 'Erro').length}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Coluna Direita: Ranking */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 min-h-[500px]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-50 pb-4 mb-5 gap-3">
              <div className="flex items-center gap-3">
                <button 
                  onClick={toggleSelectionMode}
                  className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm h-[40px] ${isSelectionMode ? 'bg-scifi_red border-scifi_red text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                   <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelectionMode ? 'bg-white border-white text-scifi_red' : 'border-gray-300'}`}>
                    {isSelectionMode && selectedIds.length === currentCandidatos.length && currentCandidatos.length > 0 ? <Check size={12} strokeWidth={4} /> : isSelectionMode && selectedIds.length > 0 ? <div className="w-2 h-0.5 bg-scifi_red rounded-full"></div> : null}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {isSelectionMode ? (selectedIds.length > 0 ? `${selectedIds.length} selecionados` : 'Cancelar') : 'Selecionar'}
                  </span>
                </button>

                <h3 className="text-base font-bold text-gray-800">Ranking</h3>
                
                {isSelectionMode && selectedIds.length > 0 && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                    <button 
                      onClick={handleBulkDownload}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
                      title="Baixar Selecionados"
                    >
                      <Download size={14} /> Baixar
                    </button>
                    <button 
                      onClick={() => setShowBulkDeleteModal(true)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
                      title="Excluir Selecionados"
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  </div>
                )}

                {isSelectionMode && (
                  <button 
                    onClick={toggleSelectAll}
                    className="p-1.5 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors text-[11px] font-bold uppercase tracking-wider"
                  >
                    Todos
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <button
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm hover:bg-gray-100 transition-all text-gray-700 shadow-sm group"
                  title={sortOrder === 'desc' ? "Mudar para Menor Pontuação" : "Mudar para Maior Pontuação"}
                >
                  <Filter size={16} className="text-scifi_red group-hover:scale-110 transition-transform" />
                  <div className="flex items-center gap-1.5">
                    {sortOrder === 'desc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    <span className="text-xs font-semibold whitespace-nowrap">
                      {sortOrder === 'desc' ? 'Maior Pontuação' : 'Menor Pontuação'}
                    </span>
                  </div>
                </button>
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  className="w-full md:w-56 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-scifi_red focus:outline-none focus:ring-2 focus:ring-scifi_red/20 transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {currentCandidatos.map((c, index) => {
                const absoluteIndex = indexOfFirstItem + index + 1;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleCardClick(c)}
                    className={`p-4 rounded-xl border transition-all duration-150 shadow-sm flex items-center justify-between gap-4 ${getScoreStyle(c)}`}
                  >
                    {/* Lado Esquerdo: Identificação e Nome */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {isSelectionMode && (
                        <div 
                          onClick={(e) => toggleSelectCandidate(e, c.id)}
                          className={`w-5 h-5 flex-shrink-0 rounded border cursor-pointer transition-all flex items-center justify-center ${selectedIds.includes(c.id) ? 'bg-scifi_red border-scifi_red text-white' : 'border-gray-300 bg-white hover:border-scifi_red'}`}
                        >
                          {selectedIds.includes(c.id) && <Check size={14} strokeWidth={3} />}
                        </div>
                      )}
                      <span className="text-gray-300 font-bold text-sm w-6">#{absoluteIndex}</span>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-800 text-sm truncate">
                          {c.nome_candidato || c.filename.replace('.pdf', '')}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          {/* Status Badge */}
                          {c.status === 'Pendente' && (
                            <span className="text-yellow-600 text-[11px] font-medium flex items-center gap-1">
                              <RefreshCw size={10} className="animate-spin" /> Processando...
                            </span>
                          )}
                          {c.status === 'Erro' && (
                            <span className="text-red-500 text-[11px] font-medium flex items-center gap-1">
                              <AlertTriangle size={10} /> Erro de leitura
                            </span>
                          )}
                          {c.status === 'Concluido' && (
                            <span className="text-green-600 text-[11px] font-medium flex items-center gap-1">
                              <CheckCircle size={10} /> Avaliado
                            </span>
                          )}
                          {c.status === 'Concluido' && (
                            <span className="hidden sm:block text-[11px] text-scifi_red font-semibold">
                              • Ver detalhes →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Lado Direito: Score e Ações */}
                    <div className="flex items-center gap-4">
                      {c.status === 'Concluido' && (
                        <div className="flex flex-col items-end mr-2">
                          <span className={`text-base font-bold px-3 py-0.5 rounded-lg ${getScoreBadgeStyle(c.score_revisado !== null ? c.score_revisado : c.score)}`}>
                            {c.score_revisado !== null ? c.score_revisado : c.score}
                          </span>
                          {c.score_revisado !== null && (
                            <span className="text-[9px] bg-purple-50 text-purple-600 border border-purple-100 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider mt-1 flex items-center gap-0.5" title="Revisão Humana">
                              <User size={8} /> RH
                            </span>
                          )}
                        </div>
                      )}

                      {(c.status === 'Concluido' || c.status === 'Erro') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReprocessar(c.id);
                          }}
                          className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-md transition-colors"
                          title="Reanalisar Currículo"
                        >
                          <RefreshCw size={18} className={c.status === 'Erro' ? 'animate-pulse text-orange-500' : ''} />
                        </button>
                      )}

                      {c.status === 'Concluido' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPdfUrl(`${api.defaults.baseURL || 'http://localhost:8000'}/candidatos/${c.id}/pdf`);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                          title="Visualizar PDF Original"
                        >
                          <FileText size={18} />
                        </button>
                      )}

                      <button
                        onClick={(e) => handleDeleteCandidato(e, c)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Excluir Candidato"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {currentCandidatos.length === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm">
                  {searchTerm ? 'Nenhum candidato encontrado para este filtro.' : 'Nenhum candidato processado ainda.'}
                </div>
              )}

              {/* Controles de Paginação */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6 pt-6 border-t border-gray-50">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-scifi_red disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1
                            ? 'bg-scifi_red text-white'
                            : 'text-gray-500 hover:bg-gray-100'
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-400 hover:text-scifi_red disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Modal Confirmar Deleção de Candidato */}
      {itemParaDeletar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200 text-center">
            <div className="bg-red-50 p-4 rounded-full mb-4 inline-flex">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Currículo?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Deseja realmente excluir o currículo de <span className="font-semibold text-gray-700">"{itemParaDeletar.nome_candidato || itemParaDeletar.filename}"</span>? Esta ação é irreversível.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setItemParaDeletar(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDelecao}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white font-semibold text-sm rounded-xl hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-95"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Análise */}
      {selectedJson && selectedCandidato && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto"
          onClick={() => {
            setSelectedJson(null);
            setSelectedCandidato(null);
          }}
        >
          <div className="min-h-screen px-4 text-center flex items-start justify-center pt-10 pb-20">
            {/* O conteúdo do modal em si */}
            <div
              className="w-full max-w-6xl relative bg-white border border-gray-100 shadow-2xl rounded-2xl overflow-hidden text-left flex flex-col md:flex-row animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botão de Fechar interno */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => {
                    setSelectedJson(null);
                    setSelectedCandidato(null);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-full transition-colors flex items-center justify-center"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Lado Esquerdo: Análise da IA */}
              <div className="flex-1 overflow-y-auto max-h-[85vh]">
                <AnalysisCard data={selectedJson} />
              </div>

              {/* Lado Direito: Painel de Revisão Humana (Art. 20 LGPD) */}
              <div className="w-full md:w-80 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-100 p-6 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
                <div>
                  <h3 className="text-gray-900 font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                    <User className="text-scifi_red" size={16} /> Revisão Humana
                  </h3>
                  <p className="text-gray-500 text-[11px] leading-relaxed mb-5">
                    O <strong>Artigo 20 da LGPD</strong> garante aos candidatos o direito de solicitar a revisão de decisões tomadas com base em algoritmos automatizados.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Nota do Recrutador (0 a 100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={revisedScore}
                        onChange={(e) => setRevisedScore(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 focus:border-scifi_red focus:outline-none focus:ring-2 focus:ring-scifi_red/20 transition-all"
                      />
                      <span className="text-[10px] text-gray-400 mt-1.5 block">
                        Nota original da IA: <span className="font-semibold">{selectedCandidato.score}%</span>
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Parecer / Justificativa
                      </label>
                      <textarea
                        rows="8"
                        value={revisedComments}
                        onChange={(e) => setRevisedComments(e.target.value)}
                        placeholder="Justifique a alteração da nota e adicione observações sobre a compatibilidade técnica..."
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:border-scifi_red focus:outline-none focus:ring-2 focus:ring-scifi_red/20 transition-all resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-2">
                  <button
                    onClick={handleSaveRevision}
                    disabled={savingRevision}
                    className="w-full bg-scifi_red hover:bg-scifi_red_dim text-white py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50 active:scale-[0.98]"
                  >
                    {savingRevision ? "Salvando..." : "Salvar Revisão"}
                  </button>
                  {selectedCandidato.score_revisado !== null && (
                    <button
                      onClick={handleRevertRevision}
                      disabled={savingRevision}
                      className="w-full bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                    >
                      Restaurar Nota da IA
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de PDF */}
      {selectedPdfUrl && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 md:p-8"
          onClick={() => setSelectedPdfUrl(null)}
        >
          <div 
            className="bg-white w-full max-w-5xl h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Visualizar Currículo</h3>
                  <p className="text-xs text-gray-500">Documento original enviado pelo candidato</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPdfUrl(null)}
                className="p-2 hover:bg-gray-200 text-gray-500 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 bg-gray-200/50 relative">
              <iframe 
                src={selectedPdfUrl} 
                className="w-full h-full border-none"
                title="Visualizador de PDF"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Deleção em Lote */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-50 p-4 rounded-full mb-4">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir {selectedIds.length} Candidatos?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Você está prestes a excluir permanentemente os currículos e análises dos candidatos selecionados. Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white font-semibold text-sm rounded-xl hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {notification && (
        <div className="fixed bottom-5 right-5 z-[200] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm ${
            notification.type === 'success' 
              ? 'bg-green-50 border-green-100 text-green-800' 
              : 'bg-red-50 border-red-100 text-red-800'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="text-red-500 w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-xs font-semibold leading-normal">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors ml-auto p-1 hover:bg-black/5 rounded"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
