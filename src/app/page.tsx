"use client";

import React, { useState, useEffect } from "react";

interface FieldMappingConfig {
  contactFields: {
    fullname: string;
    phone: string;
    email: string;
    propertyCode: string;
  };
  customQuestions: Array<{
    id: string;
    metaKey: string;
    label: string;
    target: "message" | "profile" | "property_code" | "ignore";
    includeInNote: boolean;
    includeInProfile: boolean;
  }>;
  noteTitleTemplate: string;
  leadSource: string;
}

interface LeadRecord {
  id: string;
  timestamp: string;
  name: string;
  phone: string;
  email: string;
  propertyCode?: string;
  imobziCode?: string;
  imobziDbId?: string;
  status: "success" | "failed";
  source: string;
  formId?: string;
  formName?: string;
  campaignName?: string;
  adName?: string;
  platform?: string;
  formattedNote?: string;
}

interface MetaForm {
  id: string;
  name: string;
  status: string;
  locale?: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"mapping" | "preview" | "forms" | "history" | "simulator">("mapping");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Configuração de Mapeamento
  const [config, setConfig] = useState<FieldMappingConfig>({
    contactFields: {
      fullname: "nome_completo",
      phone: "phone_number",
      email: "email",
      propertyCode: "Código do Imóvel",
    },
    customQuestions: [],
    noteTitleTemplate: "Contato de {nome} sobre o imóvel de cód. {codigo_imovel}",
    leadSource: "Facebook Leads - ASN Negócios Imobiliários",
  });

  // Formulários Meta detectados na Página
  const [metaForms, setMetaForms] = useState<MetaForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [formSearch, setFormSearch] = useState<string>("");

  // Histórico de Leads
  const [leads, setLeads] = useState<LeadRecord[]>([]);

  // Simulador de teste
  const [simName, setSimName] = useState("Cláudia Silva");
  const [simPhone, setSimPhone] = useState("(22) 99734-7196");
  const [simEmail, setSimEmail] = useState("claudia.silva@exemplo.com");
  const [simImovel, setSimImovel] = useState("386");
  const [simCampaign, setSimCampaign] = useState("Campanha Lançamento Alphaville II");
  const [simAd, setSimAd] = useState("Anúncio Casas Modernas 3 Qts");
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Novo campo customizado no formulário
  const [newMetaKey, setNewMetaKey] = useState("");
  const [newLabel, setNewLabel] = useState("");

  // Informações para Callback URL do Webhook Meta
  const [callbackUrl, setCallbackUrl] = useState("");
  const [verifyToken, setVerifyToken] = useState("imobzimetatoken2026");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const handleCopy = (text: string, type: "url" | "token") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === "url") {
      setCopiedUrl(true);
      showToast("📋 Callback URL copiada com sucesso!");
      setTimeout(() => setCopiedUrl(false), 3000);
    } else {
      setCopiedToken(true);
      showToast("📋 Verify Token copiado com sucesso!");
      setTimeout(() => setCopiedToken(false), 3000);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [mapRes, histRes, formsRes] = await Promise.all([
        fetch("/api/mapping").then((r) => r.json()).catch(() => null),
        fetch("/api/leads-history").then((r) => r.json()).catch(() => null),
        fetch("/api/meta-forms").then((r) => r.json()).catch(() => null),
      ]);

      if (mapRes && mapRes.contactFields) {
        setConfig(mapRes);
      }
      if (histRes && histRes.leads) {
        setLeads(histRes.leads);
      }
      if (formsRes && formsRes.forms && Array.isArray(formsRes.forms)) {
        setMetaForms(formsRes.forms);
        if (formsRes.forms.length > 0 && !selectedFormId) {
          setSelectedFormId(formsRes.forms[0].id);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      showToast("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCallbackUrl(`${window.location.origin}/api/webhook/meta`);
    }
    fetch("/api/webhook-info")
      .then((r) => r.json())
      .then((d) => {
        if (d.verifyToken) setVerifyToken(d.verifyToken);
      })
      .catch(() => {});
    loadData();
  }, []);

  const handleSaveMapping = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        showToast("✅ Mapeamento de campos salvo com sucesso!");
      } else {
        showToast("Erro ao salvar: " + (data.error || "Tente novamente"));
      }
    } catch (err) {
      console.error(err);
      showToast("Erro ao conectar com a API");
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = () => {
    if (!newMetaKey.trim() || !newLabel.trim()) {
      showToast("Preencha o nome do campo e o rótulo");
      return;
    }

    const newQuestion = {
      id: Date.now().toString(),
      metaKey: newMetaKey.trim(),
      label: newLabel.trim(),
      target: "profile" as const,
      includeInNote: true,
      includeInProfile: true,
    };

    setConfig({
      ...config,
      customQuestions: [...config.customQuestions, newQuestion],
    });

    setNewMetaKey("");
    setNewLabel("");
    showToast("Campo adicionado à lista!");
  };

  const handleRemoveQuestion = (id: string) => {
    setConfig({
      ...config,
      customQuestions: config.customQuestions.filter((q) => q.id !== id),
    });
  };

  const handleRunSimulation = async () => {
    try {
      setSimulating(true);
      setSimResult(null);

      const selectedForm = metaForms.find((f) => f.id === selectedFormId);
      const res = await fetch("/api/test-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: simName,
          phone: simPhone,
          email: simEmail,
          imovelCode: simImovel,
          formId: selectedFormId || undefined,
          formName: selectedForm?.name || undefined,
          campaignName: simCampaign,
          adName: simAd,
        }),
      });

      const data = await res.json();
      setSimResult(data);

      if (data.success) {
        showToast("🎉 Lead enviado com sucesso para o Imobzi!");
        fetch("/api/leads-history")
          .then((r) => r.json())
          .then((d) => {
            if (d.leads) {
              setLeads(d.leads);
                          }
          });
      } else {
        showToast("Falha ao simular envio");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro na simulação");
    } finally {
      setSimulating(false);
    }
  };

  // Monta texto dinâmico para o Preview do Imobzi
  const generatePreviewNote = () => {
    const title = (config.noteTitleTemplate || "Contato de {nome} sobre o imóvel de cód. {codigo_imovel}")
      .replace("{nome}", simName || "Cláudia")
      .replace("{codigo_imovel}", simImovel || "386");

    const profileQuestions = config.customQuestions.filter((q) => q.includeInProfile && q.target !== "ignore");
    const messageQuestions = config.customQuestions.filter((q) => !q.includeInProfile && q.target !== "ignore");
    const selectedForm = metaForms.find((f) => f.id === selectedFormId);

    return {
      title,
      propertyCode: simImovel || "386",
      formName: selectedForm ? selectedForm.name : (metaForms[0]?.name || "[U.M] FORM PADRÃO - ALPHAVILLE II [LÓG.COND.] [10/09/26]"),
      campaignName: simCampaign,
      adName: simAd,
      messages: messageQuestions.map((q) => ({ label: q.label, example: "Resposta de exemplo do cliente" })),
      profiles: profileQuestions.map((q) => ({ label: q.label, example: "Opção selecionada no formulário" })),
    };
  };

  const preview = generatePreviewNote();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-7xl mx-auto space-y-6 antialiased selection:bg-cyan-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-cyan-600 text-white font-medium px-5 py-3 rounded-xl shadow-2xl shadow-cyan-500/30 flex items-center gap-3 animate-bounce border border-cyan-400">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Module Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Formulário Meta x CRM Imobzi</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Webhook Ao Vivo
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Captura automática de Leads Ads (Facebook e Instagram), mapeamento inteligente e injeção com rodízio no Imobzi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            🔄 Sincronizar Dados
          </button>
          <button
            onClick={async () => {
              try {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              } catch (err) {
                console.error("Erro ao sair:", err);
                window.location.href = "/login";
              }
            }}
            className="px-3.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded-xl text-xs font-medium border border-red-900/50 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Sair do painel"
          >
            🚪 Sair
          </button>
        </div>
      </div>

      {/* Card Destaque: Dados de Configuração do Webhook no Meta */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 p-4 md:p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-bold">
                🔗
              </span>
              <h3 className="text-sm font-bold text-white">
                Configuração do Webhook no Meta Developers
              </h3>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full font-medium">
                Pronto para copiar e colar
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Copie e cole estes dados no portal <strong>developers.facebook.com ➔ Seu App ➔ Webhooks ➔ Page (Leadgen)</strong>:
            </p>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Callback URL */}
          <div className="lg:col-span-8 bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                URL de Retorno de Chamada (Callback URL)
              </div>
              <div className="text-xs font-mono text-cyan-300 truncate select-all">
                {callbackUrl || "Carregando URL..."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(callbackUrl, "url")}
              className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-md shadow-cyan-600/20 active:scale-95"
            >
              {copiedUrl ? "✓ Copiado!" : "📋 Copiar URL"}
            </button>
          </div>

          {/* Verify Token */}
          <div className="lg:col-span-4 bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                Token de Verificação (Verify Token)
              </div>
              <div className="text-xs font-mono text-emerald-300 truncate select-all">
                {verifyToken || "imobzimetatoken2026"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(verifyToken || "imobzimetatoken2026", "token")}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer border border-slate-700 active:scale-95"
            >
              {copiedToken ? "✓ Copiado!" : "📋 Copiar Token"}
            </button>
          </div>
        </div>
      </div>

      {/* Internal Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("mapping")}
          className={`px-3.5 py-2 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 ${
            activeTab === "mapping"
              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <span>⚙️ Mapeamento de Campos</span>
        </button>

        <button
          onClick={() => setActiveTab("preview")}
          className={`px-3.5 py-2 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 ${
            activeTab === "preview"
              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <span>👁️ Visualização no Imobzi</span>
        </button>

        <button
          onClick={() => setActiveTab("forms")}
          className={`px-3.5 py-2 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 ${
            activeTab === "forms"
              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <span>📑 Formulários Meta</span>
          <span className="px-1.5 py-0.2 rounded-full bg-cyan-950 text-[10px] text-cyan-300 font-mono border border-cyan-800">
            {metaForms.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-3.5 py-2 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 ${
            activeTab === "history"
              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <span>📋 Histórico de Leads</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
            {leads.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("simulator")}
          className={`px-3.5 py-2 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 ${
            activeTab === "simulator"
              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <span>🧪 Simulador de Teste</span>
        </button>
      </div>

      {/* Content Body */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin"></div>
          <span>Carregando configurações do conector...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: MAPEAMENTO DE CAMPOS */}
          {activeTab === "mapping" && (
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Mapeamento de Campos: Lead Form ➔ Imobzi</h3>
                  <p className="text-xs text-slate-400">
                    Defina como cada dado preenchido pelo cliente no anúncio do Facebook/Instagram deve ser gravado na ficha do contato e na linha do tempo do Imobzi CRM.
                  </p>
                </div>
                <button
                  onClick={handleSaveMapping}
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "💾 Salvar Configurações"}
                </button>
              </div>

              {/* Seção 1: Dados Primários do Contato */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
                <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                  1. Dados Cadastrais Principais do Contato
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="text-xs text-slate-400 font-medium block mb-1">Nome Completo no Imobzi</label>
                    <input
                      type="text"
                      value={config.contactFields.fullname}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          contactFields: { ...config.contactFields, fullname: e.target.value },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      placeholder="nome_completo"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Nome do campo no formulário Meta</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="text-xs text-slate-400 font-medium block mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={config.contactFields.phone}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          contactFields: { ...config.contactFields, phone: e.target.value },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      placeholder="phone_number"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Número com DDD</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="text-xs text-slate-400 font-medium block mb-1">E-mail Principal</label>
                    <input
                      type="text"
                      value={config.contactFields.email}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          contactFields: { ...config.contactFields, email: e.target.value },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      placeholder="email"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">E-mail de contato</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <label className="text-xs text-slate-400 font-medium block mb-1">Código do Imóvel</label>
                    <input
                      type="text"
                      value={config.contactFields.propertyCode}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          contactFields: { ...config.contactFields, propertyCode: e.target.value },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      placeholder="Código do Imóvel"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Ex: 386, 34440, etc.</span>
                  </div>
                </div>
              </div>

              {/* Seção 2: Perguntas de Qualificação do Formulário */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                      2. Perguntas do Formulário e Formatação na Linha do Tempo
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure como cada pergunta deve aparecer no relatório de atividade e no Perfil Inteligente do Imobzi.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Campo no Facebook (Meta)</th>
                        <th className="py-3 px-4">Rótulo Limpo no Imobzi</th>
                        <th className="py-3 px-4">Destino no CRM</th>
                        <th className="py-3 px-4 text-center">Perfil Inteligente</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {config.customQuestions.map((q, idx) => (
                        <tr key={q.id || idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-cyan-300 max-w-xs truncate">
                            {q.metaKey}
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={q.label}
                              onChange={(e) => {
                                const updated = [...config.customQuestions];
                                updated[idx].label = e.target.value;
                                setConfig({ ...config, customQuestions: updated });
                              }}
                              className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white w-full max-w-sm focus:outline-none focus:border-cyan-500"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={q.target}
                              onChange={(e) => {
                                const updated = [...config.customQuestions];
                                updated[idx].target = e.target.value as any;
                                setConfig({ ...config, customQuestions: updated });
                              }}
                              className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                            >
                              <option value="profile">Perfil Inteligente do Lead</option>
                              <option value="message">Mensagem da Linha do Tempo</option>
                              <option value="property_code">Código do Imóvel</option>
                              <option value="ignore">❌ Ignorar Campo</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={q.includeInProfile}
                              onChange={(e) => {
                                const updated = [...config.customQuestions];
                                updated[idx].includeInProfile = e.target.checked;
                                setConfig({ ...config, customQuestions: updated });
                              }}
                              className="h-4 w-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleRemoveQuestion(q.id)}
                              className="text-slate-500 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Adicionar Nova Pergunta */}
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row items-end gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
                  <div className="flex-1 w-full">
                    <label className="text-xs text-slate-400 font-medium block mb-1">
                      + Nome exato da Pergunta no Facebook
                    </label>
                    <input
                      type="text"
                      value={newMetaKey}
                      onChange={(e) => setNewMetaKey(e.target.value)}
                      placeholder="Ex: deseja_financiar_ou_a_vista?"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="text-xs text-slate-400 font-medium block mb-1">
                      Rótulo amigável para o Imobzi
                    </label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Ex: Forma de Pagamento Desejada"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    onClick={handleAddQuestion}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg font-medium text-xs transition-colors shrink-0"
                  >
                    + Adicionar Campo
                  </button>
                </div>
              </div>

              {/* Seção 3: Modelo de Título da Atividade */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
                <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-400"></span>
                  3. Modelo do Título da Atividade no Imobzi
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  Use variáveis como <code className="text-cyan-400">{"{nome}"}</code> e <code className="text-cyan-400">{"{codigo_imovel}"}</code> para personalizar o título exibido na linha do tempo.
                </p>
                <input
                  type="text"
                  value={config.noteTitleTemplate}
                  onChange={(e) => setConfig({ ...config, noteTitleTemplate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* TAB 2: VISUALIZAÇÃO NO IMOBZI */}
          {activeTab === "preview" && (
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <h3 className="text-lg font-bold text-white mb-1">Pré-visualização em Tempo Real no Imobzi</h3>
                <p className="text-xs text-slate-400">
                  Veja abaixo exatamente como o contato e a linha do tempo serão cadastrados dentro do seu CRM Imobzi com base nas regras configuradas no mapeamento.
                </p>
              </div>

              {/* Simulador de Tela do Imobzi */}
              <div className="bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-300">
                <div className="bg-gradient-to-r from-[#173b57] via-[#104e7a] to-[#0e3a5a] text-white p-8 text-center relative">
                  <div className="h-20 w-20 rounded-full bg-[#f43f5e] text-white font-bold text-3xl flex items-center justify-center mx-auto shadow-xl border-4 border-white/20">
                    {simName ? simName.charAt(0).toUpperCase() : "C"}
                  </div>
                  <h3 className="text-2xl font-bold mt-2">{simName || "Cláudia"}</h3>
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <div className="h-9 w-9 rounded-full bg-[#0d9488] text-white flex items-center justify-center shadow cursor-pointer hover:opacity-90">
                      📞
                    </div>
                    <div className="h-9 w-9 rounded-full bg-[#10b981] text-white flex items-center justify-center shadow cursor-pointer hover:opacity-90">
                      💬
                    </div>
                    <div className="h-9 w-9 rounded-full bg-[#0284c7] text-white flex items-center justify-center shadow cursor-pointer hover:opacity-90">
                      ✉️
                    </div>
                  </div>

                  <div className="flex justify-around mt-8 pt-2 border-t border-white/10 text-xs font-semibold tracking-wider uppercase text-white/80">
                    <span className="text-white border-b-2 border-white pb-1 cursor-pointer">Atividades</span>
                    <span className="cursor-pointer hover:text-white">Dados</span>
                    <span className="cursor-pointer hover:text-white">Movimentações</span>
                    <span className="cursor-pointer hover:text-white">Finanças</span>
                  </div>
                </div>

                <div className="bg-[#1e293b] text-center py-3 px-4 border-b border-slate-200">
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-300">
                    <span>⚠️ Mensagem recebida pelo seu anúncio do Facebook</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Por favor, leia a mensagem abaixo e atribua a um corretor para atendimento
                  </p>
                  <button className="mt-2 text-[11px] font-bold px-3 py-1 rounded bg-[#0f766e] text-white uppercase tracking-wider">
                    Confirmo que este contato foi revisado
                  </button>
                </div>

                <div className="p-8 bg-[#f8fafc] min-h-[400px]">
                  <div className="max-w-3xl mx-auto">
                    <div className="text-xs text-slate-400 mb-4 font-semibold uppercase">Setembro</div>

                    <div className="flex items-start gap-4">
                      <div className="h-8 w-8 rounded-full bg-[#0284c7] text-white flex items-center justify-center text-sm shadow shrink-0">
                        ✏️
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-800">
                          {preview.title}
                        </h4>
                        <span className="text-[11px] text-slate-400 block mb-2">
                          Agora • por Conector Meta (via Facebook Leads)
                        </span>

                        <div className="bg-white border border-slate-300 rounded-xl p-6 text-sm text-slate-700 shadow-sm space-y-4">
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono space-y-1 text-slate-800">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>📋 Formulário:</span>
                              <span className="text-blue-700">{preview.formName}</span>
                            </div>
                            {preview.campaignName && (
                              <div className="text-slate-600">🎯 Campanha: {preview.campaignName}</div>
                            )}
                            {preview.adName && (
                              <div className="text-slate-600">📢 Anúncio: {preview.adName}</div>
                            )}
                            <div className="text-slate-500">📱 Plataforma: Instagram / Facebook Leads</div>
                          </div>

                          <p className="text-slate-800">
                            Olá! Tenho interesse no imóvel de cód. <strong className="text-blue-600">{preview.propertyCode}</strong> e gostaria de receber mais informações.
                          </p>

                          {preview.messages.length > 0 && (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Respostas do Formulário Facebook:
                              </h5>
                              <ul className="space-y-1.5 text-xs text-slate-700">
                                {preview.messages.map((m, i) => (
                                  <li key={i}>
                                    <strong>{m.label}:</strong> {m.example}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {preview.profiles.length > 0 && (
                            <div className="bg-blue-50/60 p-4 rounded-lg border border-blue-200">
                              <h5 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">
                                Perfil Inteligente do Lead:
                              </h5>
                              <ul className="space-y-1.5 text-xs text-slate-700">
                                {preview.profiles.map((p, i) => (
                                  <li key={i}>
                                    <strong>{p.label}:</strong> {p.example}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 flex items-center justify-between font-mono">
                            <span>Origem: {config.leadSource}</span>
                            <span>ID Lead Ads: 1587593216394747</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FORMULÁRIOS META */}
          {activeTab === "forms" && (
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    <span>Formulários Ativos da Página Meta ({metaForms.length})</span>
                    <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                      100% Conectados ao Webhook
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Todos os formulários abaixo pertencem à Página <strong>ASN Negócios Imobiliários</strong> e são capturados automaticamente em tempo real para o Imobzi CRM.
                  </p>
                </div>
                <input
                  type="text"
                  value={formSearch}
                  onChange={(e) => setFormSearch(e.target.value)}
                  placeholder="🔍 Filtrar formulários por nome..."
                  className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 w-full md:w-72"
                />
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/80">
                      <th className="py-3 px-4">Nome do Formulário Meta</th>
                      <th className="py-3 px-4">ID do Formulário</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {metaForms
                      .filter((f) => f.name.toLowerCase().includes(formSearch.toLowerCase()) || f.id.includes(formSearch))
                      .map((f) => (
                        <tr key={f.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-medium text-white max-w-md">
                            <div className="truncate" title={f.name}>{f.name}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-cyan-400">
                            {f.id}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              f.status === "ACTIVE"
                                ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                                : "bg-slate-800 border-slate-700 text-slate-400"
                            }`}>
                              {f.status === "ACTIVE" ? "✓ ATIVO" : f.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedFormId(f.id);
                                setActiveTab("simulator");
                                showToast(`Formulário selecionado: ${f.name}`);
                              }}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
                            >
                              🧪 Testar no Simulador
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: HISTÓRICO DE LEADS */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Histórico de Leads Recebidos</h3>
                  <p className="text-xs text-slate-400">
                    Registro em tempo real de todos os leads recebidos pelo Webhook com identificação do formulário de origem.
                  </p>
                </div>
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
                >
                  🔄 Atualizar Lista
                </button>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/80">
                      <th className="py-3.5 px-4">Data / Hora</th>
                      <th className="py-3.5 px-4">Nome do Lead</th>
                      <th className="py-3.5 px-4">Telefone</th>
                      <th className="py-3.5 px-4">Formulário de Origem</th>
                      <th className="py-3.5 px-4">Código Imobzi</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          Nenhum lead registrado no histórico ainda.
                        </td>
                      </tr>
                    ) : (
                      leads.map((lead, idx) => (
                        <tr key={lead.id || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 text-slate-400">
                            {new Date(lead.timestamp).toLocaleString("pt-BR")}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white">
                            {lead.name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {lead.phone || "—"}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-cyan-300 max-w-xs truncate" title={lead.formName || lead.formId || lead.source}>
                              {lead.formName || (lead.formId ? `Form #${lead.formId}` : lead.source)}
                            </div>
                            {lead.campaignName && (
                              <div className="text-[10px] text-slate-400 truncate max-w-xs">{lead.campaignName}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {lead.imobziCode ? (
                              <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                                #{lead.imobziCode}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {lead.status === "success" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                                ✓ Enviado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-red-400 font-medium">
                                ✗ Falha
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: SIMULADOR DE TESTE */}
          {activeTab === "simulator" && (
            <div className="space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <h3 className="text-lg font-bold text-white mb-1">Simulador de Envio para o Imobzi</h3>
                <p className="text-xs text-slate-400">
                  Selecione qualquer formulário real da sua página e dispare um teste imediato para validar como ele chega na linha do tempo e no rodízio de corretores do Imobzi.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Formulário do Simulador */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h4 className="text-sm font-semibold text-white mb-2">Dados da Simulação</h4>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Formulário Meta de Origem ({metaForms.length} disponíveis)
                    </label>
                    <select
                      value={selectedFormId}
                      onChange={(e) => setSelectedFormId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      {metaForms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} (ID: {f.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Nome do Cliente</label>
                    <input
                      type="text"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={simPhone}
                      onChange={(e) => setSimPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">E-mail</label>
                    <input
                      type="email"
                      value={simEmail}
                      onChange={(e) => setSimEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Código do Imóvel de Interesse</label>
                    <input
                      type="text"
                      value={simImovel}
                      onChange={(e) => setSimImovel(e.target.value)}
                      placeholder="Ex: 386 ou 34440"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Nome da Campanha</label>
                      <input
                        type="text"
                        value={simCampaign}
                        onChange={(e) => setSimCampaign(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Nome do Anúncio</label>
                      <input
                        type="text"
                        value={simAd}
                        onChange={(e) => setSimAd(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleRunSimulation}
                    disabled={simulating}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 text-xs"
                  >
                    {simulating ? "Enviando para o Imobzi..." : "🚀 Disparar Teste com este Formulário"}
                  </button>
                </div>

                {/* Retorno do Imobzi */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Resposta da API do Imobzi</h4>
                    <p className="text-xs text-slate-400 mb-4">
                      Veja o retorno instantâneo com o código de identificação do contato e a vinculação automática no CRM.
                    </p>

                    {simResult ? (
                      <div
                        className={`p-4 rounded-xl border font-mono text-xs ${
                          simResult.success
                            ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                            : "bg-red-950/40 border-red-800 text-red-300"
                        }`}
                      >
                        <pre className="overflow-x-auto">{JSON.stringify(simResult, null, 2)}</pre>
                      </div>
                    ) : (
                      <div className="p-12 text-center text-slate-600 border border-dashed border-slate-800 rounded-xl text-xs">
                        Clique no botão ao lado para executar a simulação e ver o resultado aqui.
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
                    Endpoint destino: <code className="text-cyan-400">POST https://api.imobzi.app/v1/integration/lead</code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
