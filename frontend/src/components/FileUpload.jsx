import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, Loader2, Files } from 'lucide-react';
import api from '../services/api';

const FileUpload = ({ vagaId, onUploadSuccess, showNotification }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [consent, setConsent] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!consent) {
      return showNotification("Você deve confirmar o consentimento/base legal da LGPD para prosseguir com o upload!", "error");
    }
    if (!files || files.length === 0) return showNotification("Selecione os currículos em PDF!", "error");

    setLoading(true);
    setSuccess(false);

    try {
      let count = 0;
      for (const file of files) {
        setProgressText(`Enviando ${count + 1} de ${files.length}...`);
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/vagas/${vagaId}/upload`, formData);
        count++;
      }

      setSuccess(true);
      setFiles([]);
      setConsent(false);
      if(onUploadSuccess) onUploadSuccess();
      showNotification("Todos os currículos foram enviados com sucesso!", "success");

      setTimeout(() => {
        setSuccess(false);
        setProgressText('');
      }, 4000);

    } catch (error) {
      console.error("Erro no envio em lote:", error);
      showNotification("Houve falha ao enviar um ou mais arquivos.", "error");
    } finally {
      setLoading(false);
      setProgressText('');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <UploadCloud size={18} className="text-scifi_red" /> Enviar Currículos
      </h3>
      <p className="text-xs text-gray-400 mb-5">Upload em lote de PDFs para análise automática por IA.</p>

      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        <label className="border-2 border-dashed border-gray-200 hover:border-scifi_red bg-gray-50 hover:bg-scifi_red_light transition-all rounded-xl p-5 text-center cursor-pointer relative">
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {files.length === 0 ? (
            <div className="text-gray-400 text-xs flex flex-col items-center gap-2">
              <Files size={22} className="text-gray-300" />
               <span>Clique ou arraste os PDFs aqui</span>
            </div>
          ) : (
            <div className="text-scifi_red font-semibold text-sm">
              <span className="text-2xl block mb-1">{files.length}</span>
              arquivo(s) selecionado(s)
            </div>
          )}
        </label>

        <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-100 rounded-lg p-3">
          <input
            id="lgpd-consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-scifi_red focus:ring-scifi_red/20 transition-all cursor-pointer"
          />
          <label htmlFor="lgpd-consent" className="text-[11px] text-gray-500 leading-snug select-none cursor-pointer">
            Declaro que possuo consentimento explícito dos candidatos ou base legal válida nos termos da <strong>LGPD</strong> para tratar esses dados.
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || files.length === 0 || !consent}
          className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold flex justify-center items-center gap-2 transition-all ${
            loading || !consent
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : success
                ? 'bg-green-600 text-white shadow-sm'
                : files.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-scifi_red hover:bg-scifi_red_dim text-white shadow-sm'
          }`}
        >
          {loading && <Loader2 className="animate-spin" size={16} />}
          {success && <CheckCircle2 size={16} />}
          {loading ? progressText : success ? 'Enviados com sucesso!' : `Analisar ${files.length} PDF(s)`}
        </button>
      </form>
    </div>
  );
};

export default FileUpload;