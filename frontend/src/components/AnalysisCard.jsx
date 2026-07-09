import React from 'react';
import { Target, Cpu, AlertCircle, ShieldAlert, Key, EyeOff } from 'lucide-react';

const AnalysisCard = ({ data }) => {
  if (!data) return null;

  const getScoreColor = (score) => {
    if (score > 70) return 'text-green-600';
    if (score > 50) return 'text-yellow-600';
    return 'text-red-500';
  };

  const getScoreBg = (score) => {
    if (score > 70) return 'bg-green-50 border-green-100';
    if (score > 50) return 'bg-yellow-50 border-yellow-100';
    return 'bg-red-50 border-red-100';
  };

  return (
    <div className="p-8 bg-white">
      {/* Header */}
      <div className="flex justify-between items-start mb-7 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="bg-scifi_red_light p-2 rounded-lg">
              <Cpu className="text-scifi_red" size={20} />
            </div>
            Análise do Candidato
          </h2>
          <p className="text-gray-500 text-sm mt-1.5 font-medium">{data.nome}</p>
        </div>
        <div className={`text-center px-5 py-3 rounded-xl border ${getScoreBg(data.score)}`}>
          <span className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Afinidade</span>
          <span className={`text-4xl font-black ${getScoreColor(data.score)}`}>
            {data.score}%
          </span>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-gray-50 border border-gray-100 border-l-4 border-l-scifi_red p-4 rounded-lg mb-7">
        <p className="text-gray-600 italic text-sm leading-relaxed">"{data.resumo_executivo || data.resumo}"</p>
      </div>

      {/* Palavras-chave */}
      {data.palavras_chave_encontradas && data.palavras_chave_encontradas.length > 0 && (
        <div className="mb-7">
          <h3 className="text-gray-800 font-semibold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <Key size={15} className="text-scifi_red" /> Habilidades Confirmadas
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.palavras_chave_encontradas.map((kw, i) => (
              <span key={i} className="bg-scifi_red_light text-scifi_red border border-scifi_red/15 px-3 py-1 rounded-full text-xs font-semibold">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Anti-Viés 
      {(data.info_removida || (data.alertas_vies && data.alertas_vies.length > 0 && data.alertas_vies[0] !== 'nenhum')) && (
        <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl mb-7">
          <h3 className="text-blue-800 font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldAlert size={15} /> Relatório Anti-Viés
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {data.info_removida && Object.keys(data.info_removida).length > 0 && (
              <div>
                <h4 className="text-blue-700 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <EyeOff size={12}/> Dados Anonimizados
                </h4>
                <ul className="text-sm text-blue-600 space-y-1 font-mono">
                  {Object.keys(data.info_removida).map((chave, i) => (
                    <li key={i} className="text-xs">· {chave}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.alertas_vies && data.alertas_vies.length > 0 && data.alertas_vies[0] !== 'nenhum' && (
              <div>
                <h4 className="text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">Vieses Ignorados pela IA</h4>
                <ul className="text-sm text-blue-600 space-y-1 font-mono">
                  {data.alertas_vies.map((alerta, i) => (
                    <li key={i} className="text-xs">· {alerta}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}*/}

      {/* Critérios */}
      <h3 className="text-gray-800 font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
        <Target size={15} className="text-scifi_red" /> Análise por Critério
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
        {data.analise_detalhada && Object.entries(data.analise_detalhada).map(([criterio, desc]) => {
          const isObject = typeof desc === 'object' && desc !== null;
          const nota = isObject ? desc.nota : null;
          const texto = isObject ? desc.texto : desc;

          const notaColor =
            nota === null ? ''
              : nota >= 8 ? 'bg-green-100 text-green-700 border-green-200'
                : nota >= 5 ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                  : 'bg-red-100 text-red-600 border-red-200';

          return (
            <div key={criterio} className="bg-gray-50 border border-gray-100 rounded-xl p-4 border-t-2 border-t-scifi_red/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-scifi_red text-xs uppercase tracking-wider">
                  {criterio.replace(/_/g, ' ')}
                </span>
                {nota !== null && (
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${notaColor}`}>
                    {nota}/10
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{texto}</p>
            </div>
          );
        })}
      </div>

      {/* Alertas */}
      {data.alertas && data.alertas.length > 0 && (
        <div className="bg-red-50 p-5 rounded-xl border border-red-100">
          <h3 className="text-red-700 font-semibold mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
            <AlertCircle size={15} /> Alertas da IA
          </h3>
          <ul className="space-y-2">
            {data.alertas.map((alerta, idx) => (
              <li key={idx} className="text-red-600 text-sm flex items-start gap-2">
                <span className="text-scifi_red font-bold mt-0.5">·</span> {alerta}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AnalysisCard;