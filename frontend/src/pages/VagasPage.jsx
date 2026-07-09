import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Target, Briefcase, ChevronRight, X, Search, Trash2, CheckCircle, AlertTriangle, Filter, ChevronDown, ChevronUp, Check } from 'lucide-react';
import api from '../services/api';

export default function VagasPage() {
  const [vagas, setVagas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [novaVaga, setNovaVaga] = useState({ titulo: '', descricao: '', palavras_chave: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [vagaParaDeletar, setVagaParaDeletar] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = mais recentes, 'asc' = mais antigas
  const [notification, setNotification] = useState(null);
  const itemsPerPage = 6;

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const filteredVagas = vagas.filter(vaga =>
    vaga.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordenação por data
  const sortedVagas = [...filteredVagas].sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Paginação baseada na lista ordenada
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVagas = sortedVagas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedVagas.length / itemsPerPage);

  // Resetar página ao buscar ou ordenar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortOrder]);

  useEffect(() => {
    fetchVagas();
  }, []);

  const fetchVagas = async () => {
    setLoading(true);
    setError(false);
    try {
      const resp = await api.get('/vagas');
      setVagas(resp.data);
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
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
      await api.delete('/vagas/batch', { data: selectedIds });
      setSelectedIds([]);
      setIsSelectionMode(false);
      setShowBulkDeleteModal(false);
      fetchVagas();
      showNotification('Vagas excluídas com sucesso!', 'success');
    } catch (error) {
      console.error("Erro na exclusão em lote:", error);
      showNotification('Erro ao excluir vagas', 'error');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === currentVagas.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentVagas.map(v => v.id));
    }
  };

  const toggleSelectVaga = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCreateVaga = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vagas', novaVaga);
      setShowModal(false);
      setNovaVaga({ titulo: '', descricao: '', palavras_chave: '' });
      fetchVagas();
      showNotification('Vaga criada com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showNotification('Erro ao criar vaga', 'error');
    }
  };

  const handleDeleteVaga = (e, vaga) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setVagaParaDeletar(vaga);
  };

  const confirmarDelecao = async () => {
    if (!vagaParaDeletar) return;
    try {
      await api.delete(`/vagas/${vagaParaDeletar.id}`);
      await fetchVagas();
      setVagaParaDeletar(null);
      showNotification('Vaga excluída com sucesso!', 'success');
    } catch (error) {
      console.error("Erro ao excluir vaga:", error);
      showNotification('Erro ao excluir vaga', 'error');
    }
  };

  return (
    <div className="container mx-auto px-6 py-10 max-w-6xl">
      {/* Header da Página */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">
            Painel de <span className="text-scifi_red">Vagas</span>
          </h2>
          <p className="text-gray-500 text-sm">Gerencie e analise candidatos usando IA.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm hover:bg-gray-50 transition-all text-gray-700 shadow-sm group whitespace-nowrap h-[42px]"
            title={sortOrder === 'desc' ? "Mudar para Mais Antigas" : "Mudar para Mais Recentes"}
          >
            <Filter size={16} className="text-scifi_red group-hover:scale-110 transition-transform" />
            <div className="flex items-center gap-1.5">
              {sortOrder === 'desc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              <span className="text-xs font-semibold">
                {sortOrder === 'desc' ? 'Mais Recentes' : 'Mais Antigas'}
              </span>
            </div>
          </button>

          {vagas.length > 0 && (
            <button 
              onClick={toggleSelectionMode}
              className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm h-[42px] ${isSelectionMode ? 'bg-scifi_red border-scifi_red text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              title={isSelectionMode ? "Cancelar Seleção" : "Entrar no Modo de Seleção"}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelectionMode ? 'bg-white border-white text-scifi_red' : 'border-gray-300'}`}>
                {isSelectionMode && selectedIds.length === currentVagas.length && currentVagas.length > 0 ? <Check size={12} strokeWidth={4} /> : isSelectionMode && selectedIds.length > 0 ? <div className="w-2 h-0.5 bg-scifi_red rounded-full"></div> : null}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">
                {isSelectionMode ? (selectedIds.length > 0 ? `${selectedIds.length} selecionados` : 'Cancelar') : 'Selecionar'}
              </span>
            </button>
          )}

          {isSelectionMode && selectedIds.length > 0 && (
            <button 
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2.5 text-sm hover:bg-red-100 transition-all shadow-sm h-[42px] animate-in zoom-in duration-200"
              title="Excluir Selecionadas"
            >
              <Trash2 size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Excluir</span>
            </button>
          )}

          {isSelectionMode && (
            <button 
              onClick={toggleSelectAll}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-4 py-2.5 text-sm hover:bg-gray-100 transition-all shadow-sm h-[42px]"
            >
              <span className="text-xs font-bold uppercase tracking-wider">Todos</span>
            </button>
          )}

          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar vagas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-scifi_red/20 focus:border-scifi_red transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto justify-center bg-scifi_red hover:bg-scifi_red_dim text-white font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 shadow-sm flex items-center gap-2 text-sm whitespace-nowrap"
          >
            <Plus size={18} /> Nova Vaga
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-scifi_red">
          <Target size={36} className="animate-spin" />
        </div>
      ) : error ? (
        <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-dashed border-red-200 shadow-sm">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <X size={36} className="text-red-400" />
          </div>
          <p className="text-gray-700 font-medium">Erro ao carregar vagas</p>
          <p className="text-gray-500 text-sm mt-1 mb-6 text-center max-w-xs">
            Não foi possível estabelecer conexão com o servidor. Verifique se o backend está rodando.
          </p>
          <button
            onClick={fetchVagas}
            className="bg-white border border-gray-200 text-gray-700 font-semibold text-sm py-2 px-6 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
          >
            Tentar Novamente
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {currentVagas.map(vaga => (
              <Link
                key={vaga.id}
                to={`/vaga/${vaga.id}`}
                className="group bg-white border border-gray-100 rounded-xl shadow-card hover:shadow-card-hover hover:border-gray-200 p-6 flex flex-col h-full transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {isSelectionMode && (
                      <div 
                        onClick={(e) => toggleSelectVaga(e, vaga.id)}
                        className={`w-6 h-6 rounded-lg border transition-all flex items-center justify-center ${selectedIds.includes(vaga.id) ? 'bg-scifi_red border-scifi_red text-white shadow-red-sm' : 'border-gray-200 bg-gray-50 hover:border-scifi_red'}`}
                      >
                        {selectedIds.includes(vaga.id) && <Check size={16} strokeWidth={3} />}
                      </div>
                    )}
                    <div className="bg-scifi_red_light p-2.5 rounded-lg">
                      <Briefcase className="text-scifi_red" size={22} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDeleteVaga(e, vaga)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Excluir Vaga"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight
                      size={18}
                      className="text-gray-300 group-hover:text-scifi_red group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2 leading-snug">{vaga.titulo}</h3>
                <p className="text-sm text-gray-500 line-clamp-3 mb-5 flex-1">{vaga.descricao}</p>
                <div className="border-t border-gray-50 pt-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-mono">
                      {new Date(vaga.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-xs font-semibold text-scifi_red bg-scifi_red_light px-2.5 py-1 rounded-full group-hover:bg-scifi_red group-hover:text-white transition-colors">
                      Ver ranking
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {vaga.total_candidatos > 0 ? (
                      <>
                        <span className="font-medium text-gray-600">{vaga.total_candidatos} currículo{vaga.total_candidatos > 1 ? 's' : ''}</span>
                        <span className="text-gray-300">•</span>
                        {vaga.analises_pendentes > 0 ? (
                          <span className="text-yellow-600 font-medium">{vaga.analises_pendentes} analisando...</span>
                        ) : (
                          <span className="text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle size={10} /> Prontos
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">Nenhum currículo ainda</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}

            {vagas.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-dashed border-gray-200">
                <div className="bg-gray-50 p-4 rounded-full mb-4">
                  <Target size={36} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">Nenhuma vaga cadastrada ainda.</p>
                <p className="text-gray-400 text-sm mt-1">Clique em "Nova Vaga" para começar.</p>
              </div>
            ) : filteredVagas.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-dashed border-gray-200">
                <div className="bg-gray-50 p-4 rounded-full mb-4">
                  <Search size={36} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">Nenhuma vaga encontrada para "{searchTerm}".</p>
                <p className="text-gray-400 text-sm mt-1">Tente buscar por outros termos.</p>
              </div>
            ) : null}
          </div>

          {/* Controles de Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-scifi_red disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                      currentPage === i + 1
                        ? 'bg-scifi_red text-white shadow-red-sm'
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
                className="p-2 text-gray-400 hover:text-scifi_red disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Criar Vaga */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-8 shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-50"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Nova Vaga</h3>
            <p className="text-sm text-gray-500 mb-6">Preencha os dados para criar uma nova vaga.</p>
            <form onSubmit={handleCreateVaga} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Título da Posição</label>
                <input
                  type="text" required
                  className="input-base"
                  placeholder="Ex: Desenvolvedor Senior"
                  value={novaVaga.titulo} onChange={e => setNovaVaga({ ...novaVaga, titulo: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Descrição e Requisitos
                </label>
                <textarea
                  required rows="5"
                  className="input-base font-mono text-sm leading-relaxed resize-none"
                  placeholder="Descreva as tecnologias obrigatórias, experiência necessária... A IA usará isso para avaliar os currículos."
                  value={novaVaga.descricao} onChange={e => setNovaVaga({ ...novaVaga, descricao: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Palavras-Chave <span className="text-gray-400 normal-case font-normal">(separadas por vírgula)</span>
                </label>
                <input
                  type="text"
                  className="input-base"
                  placeholder="Ex: Python, React, AWS, Docker"
                  value={novaVaga.palavras_chave} onChange={e => setNovaVaga({ ...novaVaga, palavras_chave: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 font-medium text-sm text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-scifi_red hover:bg-scifi_red_dim text-white font-semibold text-sm py-2.5 px-6 rounded-lg shadow-sm transition-all"
                >
                  Criar Vaga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Deleção */}
      {vagaParaDeletar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-50 p-4 rounded-full mb-4">
                <AlertTriangle className="text-red-500" size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Vaga?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Tem certeza que deseja excluir a vaga <span className="font-semibold text-gray-700">"{vagaParaDeletar.titulo}"</span>? Todos os currículos e análises desta vaga serão perdidos para sempre.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setVagaParaDeletar(null)}
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir {selectedIds.length} Vagas?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Esta ação é irreversível. Todas as vagas selecionadas e seus respectivos currículos e análises serão apagados permanentemente.
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
