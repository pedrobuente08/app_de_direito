CREATE TABLE IF NOT EXISTS "escritorio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(200) NOT NULL,
	"cnpj" varchar(18),
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "escritorio_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"email" varchar(200) NOT NULL,
	"senha_hash" varchar(255) NOT NULL,
	"nome" varchar(200),
	"login_aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"perfil" varchar(20) NOT NULL,
	"eh_pautista" boolean DEFAULT false NOT NULL,
	"oabs" text[],
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revogado" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comarca" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"codigo" varchar(10) NOT NULL,
	"nome" varchar(100) NOT NULL,
	"abreviado" varchar(30) NOT NULL,
	"perfil_diligencia" varchar(20),
	"exige_doc_frequente" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comarca_escritorio_id_codigo_unique" UNIQUE("escritorio_id","codigo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"nome_canonico" varchar(300) NOT NULL,
	"cnpj" varchar(18),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reu_escritorio_id_nome_canonico_unique" UNIQUE("escritorio_id","nome_canonico")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reu_alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reu_id" uuid NOT NULL,
	"alias" varchar(300) NOT NULL,
	CONSTRAINT "reu_alias_reu_id_alias_unique" UNIQUE("reu_id","alias")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"numero" varchar(30) NOT NULL,
	"login" varchar(50),
	"advogado_nome" varchar(300),
	"cliente_nome" varchar(300),
	"cliente_cpf" varchar(14),
	"reu_id" uuid,
	"reu_texto" varchar(300),
	"materia" varchar(100),
	"sistema" varchar(20) NOT NULL,
	"vara" varchar(50),
	"data_distribuicao" date,
	"data_audiencia" date,
	"hora_audiencia" time,
	"tipo_audiencia" varchar(50),
	"status_processo" varchar(20) DEFAULT 'ATIVO' NOT NULL,
	"fase_atual" varchar(50),
	"fase_updated_at" timestamp with time zone,
	"revelia_decretada" boolean DEFAULT false NOT NULL,
	"litigancia_ma_fe" boolean DEFAULT false NOT NULL,
	"hipossuficiencia_comprovada" boolean DEFAULT false NOT NULL,
	"vara_exige_doc_frequente" boolean DEFAULT false NOT NULL,
	"reu_orgao_publico" boolean DEFAULT false NOT NULL,
	"daje_emitido" boolean DEFAULT false NOT NULL,
	"daje_valor" numeric(12, 2),
	"daje_data_emissao" date,
	"daje_status" varchar(30),
	"daje_data_pedido_isencao" date,
	"daje_data_pagamento" date,
	"tipo_cr" varchar(50),
	"data_transito" date,
	"qualidade_caso" varchar(60),
	"avaliacao_recurso" jsonb,
	"justica_gratuita" boolean DEFAULT false,
	"justica_gratuita_concedida_em" date,
	"justica_gratuita_expira_em" date,
	"justica_gratuita_revisada_em" date,
	"sucumbencia_devida" boolean DEFAULT false,
	"honorario_sucumbencial_valor" varchar(30),
	"honorario_sucumbencial_status" varchar(20),
	"honorario_sucumbencial_pago_em" date,
	"sobrestamento_motivo" text,
	"sobrestado_desde" date,
	"sobrestamento_motivo_codigo" varchar(40),
	"sobrestamento_tema_afetado" varchar(100),
	"sobrestamento_previsao_retorno" date,
	"sobrestamento_revisado_em" date,
	"recurso_adversario" boolean DEFAULT false,
	"parceiro_escritorio" varchar(200),
	"parceiro_id" uuid,
	"comissao_calculada" numeric(12, 2),
	"comissao_paga" boolean DEFAULT false NOT NULL,
	"comissao_paga_em" date,
	"situacao_final" varchar(50),
	"telefone" varchar(20),
	"status_audiencia" varchar(30),
	"ultima_movimentacao_dt" timestamp with time zone,
	"ultima_movimentacao_tipo" varchar(50),
	"observacoes" text,
	"observacao_geral" text,
	"fase_travada" boolean DEFAULT false NOT NULL,
	"requer_conferencia" boolean DEFAULT false NOT NULL,
	"origem_criacao" varchar(20) DEFAULT 'MANUAL',
	"alerta_cr_vara" boolean DEFAULT false NOT NULL,
	"comprovante_residencia_tipo" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "processo_escritorio_id_numero_unique" UNIQUE("escritorio_id","numero")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extracao_pendente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"arquivo_nome" varchar(255) NOT NULL,
	"arquivo_storage_key" varchar(500),
	"texto_extraido" text NOT NULL,
	"resultado_skill" jsonb NOT NULL,
	"confidence" numeric(3, 2) NOT NULL,
	"alerta" varchar(50),
	"revisao_status" varchar(20) DEFAULT 'PENDENTE' NOT NULL,
	"sugestao_ia" jsonb,
	"revisado_por" uuid,
	"revisado_em" timestamp with time zone,
	"processo_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pendencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"processo_id" uuid NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"data_abertura" date NOT NULL,
	"data_limite" date,
	"solicitante" varchar(100),
	"responsavel" varchar(100),
	"status" varchar(30) DEFAULT 'ABERTA' NOT NULL,
	"data_cumprimento" date,
	"observacao" text,
	"origem" varchar(20) DEFAULT 'MANUAL_INTIMACOES' NOT NULL,
	"fila" varchar(30),
	"resultado" varchar(30),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pendencia_escritorio_id_processo_id_tipo_data_abertura_unique" UNIQUE("escritorio_id","processo_id","tipo","data_abertura")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pendencia_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pendencia_id_origem" uuid,
	"escritorio_id" uuid NOT NULL,
	"processo_id" uuid NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"data_abertura" date NOT NULL,
	"data_limite" date,
	"solicitante" varchar(100),
	"responsavel" varchar(100),
	"status" varchar(30) NOT NULL,
	"data_cumprimento" date,
	"observacao" text,
	"origem" varchar(20) NOT NULL,
	"created_at_origem" timestamp with time zone,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pendencia_problema" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pendencia_id_origem" uuid,
	"escritorio_id" uuid NOT NULL,
	"processo_id" uuid NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"data_abertura" date NOT NULL,
	"data_limite" date,
	"solicitante" varchar(100),
	"responsavel" varchar(100),
	"status" varchar(30) NOT NULL,
	"observacao" text,
	"origem" varchar(20) NOT NULL,
	"created_at_origem" timestamp with time zone,
	"moved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "escritorio_adversario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"nome_canonico" varchar(300) NOT NULL,
	"cnpj" varchar(18),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "escritorio_adversario_escritorio_id_nome_canonico_unique" UNIQUE("escritorio_id","nome_canonico")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "escritorio_adversario_alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_adversario_id" uuid NOT NULL,
	"alias" varchar(300) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "advogado_adversario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"escritorio_adversario_id" uuid,
	"nome_canonico" varchar(300) NOT NULL,
	"oab" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "advogado_adversario_escritorio_id_nome_canonico_unique" UNIQUE("escritorio_id","nome_canonico")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "advogado_adversario_alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advogado_adversario_id" uuid NOT NULL,
	"alias" varchar(300) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vara_documento_regra" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"vara" varchar(50) NOT NULL,
	"tipo_documento" varchar(50),
	"formato_documento" varchar(50),
	"aceita" boolean NOT NULL,
	"observacao" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processo_reprotocolo" (
	"processo_id" uuid PRIMARY KEY NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"sub_estado" varchar(50),
	"motivo_extincao" varchar(100),
	"modalidade_extincao" varchar(20),
	"data_extincao" date,
	"data_isencao_pedida" date,
	"data_isencao_resultado" varchar(20),
	"data_reprotocolo" date,
	"processo_novo_id" uuid,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notificacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"usuario_id" uuid,
	"fila" varchar(30),
	"tipo_gatilho" varchar(50),
	"entidade" varchar(50),
	"entidade_id" uuid,
	"canal" varchar(20),
	"prioridade" varchar(10),
	"conteudo" jsonb,
	"lida_em" timestamp with time zone,
	"agendada_para" timestamp with time zone,
	"enviada_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feriado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"data" date NOT NULL,
	"descricao" varchar(100),
	"tipo" varchar(20),
	CONSTRAINT "feriado_escritorio_id_data_unique" UNIQUE("escritorio_id","data")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audiencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"processo_id" uuid NOT NULL,
	"escritorio_adversario_id" uuid,
	"advogado_adversario_id" uuid,
	"tipo" varchar(50),
	"data" date NOT NULL,
	"hora" time,
	"pautista" varchar(100),
	"status" varchar(30) DEFAULT 'AGENDADA' NOT NULL,
	"autor_presenca" varchar(10),
	"reu_presenca" varchar(10),
	"motivo_ausencia" text,
	"obs_pre" text,
	"obs_pos" text,
	"link" varchar(500),
	"cenario" varchar(30),
	"cenario_observacao" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audiencia_escritorio_id_processo_id_data_unique" UNIQUE("escritorio_id","processo_id","data")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audiencia_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audiencia_id_origem" uuid,
	"escritorio_id" uuid NOT NULL,
	"processo_id" uuid NOT NULL,
	"escritorio_adversario_id" uuid,
	"tipo" varchar(50),
	"data" date NOT NULL,
	"hora" time,
	"pautista" varchar(100),
	"status" varchar(30) NOT NULL,
	"autor_presenca" varchar(10),
	"reu_presenca" varchar(10),
	"motivo_ausencia" text,
	"cenario" varchar(30),
	"cenario_observacao" text,
	"obs_pre" text,
	"obs_pos" text,
	"link" varchar(500),
	"created_at_origem" timestamp with time zone,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audiencia_lixeira" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audiencia_id_origem" uuid,
	"escritorio_id" uuid NOT NULL,
	"processo_id" uuid NOT NULL,
	"tipo" varchar(50),
	"data" date NOT NULL,
	"hora" time,
	"pautista" varchar(100),
	"status" varchar(30) NOT NULL,
	"obs_pre" text,
	"obs_pos" text,
	"link" varchar(500),
	"created_at_origem" timestamp with time zone,
	"discarded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audiencia_ausente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"audiencia_id" uuid,
	"processo_id" uuid NOT NULL,
	"numero_processo" varchar(30) NOT NULL,
	"cliente_nome" varchar(300),
	"reu_id" uuid,
	"materia" varchar(100),
	"vara" varchar(50),
	"qualidade_caso" varchar(60),
	"data_audiencia" date NOT NULL,
	"motivo_ausencia" text NOT NULL,
	"reaproveitavel" boolean,
	"reaproveitado_em" date,
	"observacoes_revisao" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comunicacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"processo_id" uuid,
	"oab" varchar(20) NOT NULL,
	"numero_processo_bruto" varchar(30),
	"tipo" varchar(50),
	"resumo" text,
	"conteudo_completo" text,
	"data_disponibilizacao" timestamp with time zone,
	"pendencia_gerada_id" uuid,
	"status" varchar(20) DEFAULT 'NAO_LIDA' NOT NULL,
	"hash_externo" varchar(64),
	"regras_resultado" varchar(10),
	"regras_erro" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oab_escuta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"oab" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oab_escuta_escritorio_id_oab_unique" UNIQUE("escritorio_id","oab")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "capturas_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"oab" varchar(20) NOT NULL,
	"fonte" varchar(20) NOT NULL,
	"iniciado_em" timestamp with time zone NOT NULL,
	"concluido_em" timestamp with time zone,
	"status" varchar(20) NOT NULL,
	"total_items" integer DEFAULT 0,
	"novos_items" integer DEFAULT 0,
	"orfas_geradas" integer DEFAULT 0,
	"erro_msg" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fontes_saude" (
	"fonte" varchar(20) NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"ultimo_ok_em" timestamp with time zone,
	"ultima_falha_em" timestamp with time zone,
	"falhas_consecutivas" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "fontes_saude_fonte_escritorio_id_pk" PRIMARY KEY("fonte","escritorio_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"feature" text NOT NULL,
	"provider" text DEFAULT 'anthropic' NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_write_tokens" integer DEFAULT 0 NOT NULL,
	"custo_brl" numeric(10, 6) NOT NULL,
	"creditos" integer NOT NULL,
	"cache_hit" boolean DEFAULT false NOT NULL,
	"latency_ms" integer,
	"processo_id" uuid,
	"conversa_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_quota" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"periodo" text NOT NULL,
	"plano" text NOT NULL,
	"creditos_total" integer NOT NULL,
	"creditos_usados" integer DEFAULT 0 NOT NULL,
	"overage_policy" text DEFAULT 'block' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_quota_tenant_periodo" UNIQUE("tenant_id","periodo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "model_registry" (
	"model" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"input_price_usd" numeric(12, 8) NOT NULL,
	"output_price_usd" numeric(12, 8) NOT NULL,
	"cache_read_discount" numeric(4, 3) DEFAULT '0.1' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "procedente_transicao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"processo_id" uuid NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"situacao_anterior" varchar(60),
	"situacao_nova" varchar(60) NOT NULL,
	"origem" varchar(20) NOT NULL,
	"usuario_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processo_procedente" (
	"processo_id" uuid PRIMARY KEY NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"familia_situacao" varchar(30) NOT NULL,
	"situacao" varchar(60) NOT NULL,
	"recurso_tipo" varchar(20),
	"recurso_origem" varchar(10),
	"recurso_resultado" varchar(20),
	"doc_pendente" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"responsavel" varchar(100),
	"obs_curta" text,
	"ultimo_visto" timestamp with time zone,
	"data_estimada_recebimento" date,
	"valor_recebido" numeric(12, 2),
	"data_recebimento" date,
	"data_protocolo_alvara" date,
	"data_alvara_expedido" date,
	"data_peticao_cumprimento" date,
	"data_penhora_realizada" date,
	"valor_penhorado" numeric(12, 2),
	"penhora_origem" varchar(50),
	"observacoes_execucao" text,
	"tem_obrigacao_fazer" boolean DEFAULT false NOT NULL,
	"obrigacao_fazer_descricao" text,
	"obrigacao_fazer_cumprida" boolean DEFAULT false NOT NULL,
	"obrigacao_fazer_cumprida_em" date,
	"serasajud_acionado" boolean DEFAULT false NOT NULL,
	"tipo_execucao" varchar(20),
	"penhora_status" varchar(30),
	"astreintes_ativa" boolean DEFAULT false NOT NULL,
	"astreintes_valor_diario" numeric(12, 2),
	"astreintes_data_inicio" date,
	"astreintes_total_acumulado" numeric(14, 2),
	"astreintes_ultima_atualizacao" date,
	"astreintes_teto" numeric(14, 2),
	"astreintes_suspensa_em" date,
	"astreintes_paga_em" date,
	"penhora_sistema" varchar(20),
	"sisbajud_numero_ordem" varchar(50),
	"sisbajud_data_bloqueio" date,
	"sisbajud_valor_bloqueado" numeric(12, 2),
	"bacenjud_data_oficio" date,
	"bacenjud_banco_alvo" varchar(100),
	"execucao_contra_orgao_publico" boolean DEFAULT false NOT NULL,
	"modalidade_execucao_pub" varchar(20),
	"numero_rpv" varchar(50),
	"numero_precatorio" varchar(50),
	"previsao_pagamento_pub" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sentenca" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"processo_id" uuid NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"grau" varchar(20) NOT NULL,
	"data" date NOT NULL,
	"valor" numeric(12, 2),
	"resultado" varchar(40) NOT NULL,
	"favoravel_para" varchar(10) NOT NULL,
	"turma" varchar(50),
	"assessor_julgador" varchar(100),
	"turno_julgamento" varchar(20),
	"extincao_modalidade" varchar(20),
	"motivo_extincao" varchar(100),
	"observacoes" text,
	"sub_resultado" varchar(30),
	"turma_recursal" smallint,
	"tipo_decisao" varchar(20),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "embargos_declaracao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sentenca_id" uuid NOT NULL,
	"processo_id" uuid NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"origem" varchar(10) NOT NULL,
	"data_interposicao" date NOT NULL,
	"prazo_julgamento" date,
	"resultado" varchar(30),
	"data_julgamento" date,
	"observacoes" text,
	"interrompe_prazo_recurso" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tutela_antecipada" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"processo_id" uuid NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"pedido_em" date NOT NULL,
	"resultado" varchar(30),
	"data_resultado" date,
	"prazo_cumprimento" date,
	"cumprida" boolean DEFAULT false NOT NULL,
	"cumprida_em" date,
	"descricao" text,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processo_sucessor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"processo_id" uuid NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"nome" varchar(300) NOT NULL,
	"cpf" varchar(14),
	"parentesco" varchar(50),
	"habilitado" boolean DEFAULT false NOT NULL,
	"habilitado_em" date,
	"documentos_recebidos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parceiro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"nome" varchar(200) NOT NULL,
	"tipo" varchar(10) NOT NULL,
	"cpf_cnpj" varchar(18),
	"comissao_percentual" numeric(5, 2),
	"cor_hex" varchar(7),
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parceiro_escritorio_id_nome_unique" UNIQUE("escritorio_id","nome")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parceiro_materia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"parceiro_id" uuid NOT NULL,
	"materia" varchar(100) NOT NULL,
	CONSTRAINT "parceiro_materia_escritorio_id_materia_unique" UNIQUE("escritorio_id","materia")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processo_producao_probatoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"processo_id" uuid NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"tipo" varchar(40) NOT NULL,
	"status" varchar(20) DEFAULT 'AGUARDANDO' NOT NULL,
	"data_designacao" date,
	"data_conclusao" date,
	"perito_nome" varchar(200),
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fase_historico" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" uuid NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"fase_anterior" varchar(50),
	"fase_nova" varchar(50) NOT NULL,
	"origem" varchar(20) NOT NULL,
	"usuario_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "improcedente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"processo_id" uuid NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"valor_sucumbencia" numeric(12, 2),
	"destinatario_sucumbencia" varchar(300),
	"status_pagamento" varchar(30) DEFAULT 'A_PAGAR' NOT NULL,
	"data_prazo_pagamento" date,
	"data_pagamento" date,
	"decisao_recurso" varchar(20),
	"certidao_credito_solicitada" boolean DEFAULT false NOT NULL,
	"certidao_credito_data" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escritorio_id" uuid,
	"usuario_id" uuid,
	"entidade" varchar(50) NOT NULL,
	"entidade_id" varchar(50) NOT NULL,
	"acao" varchar(20) NOT NULL,
	"diff" jsonb,
	"ip" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(200) NOT NULL,
	"senha_hash" varchar(255) NOT NULL,
	"nome" varchar(200),
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_admin_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "status_historico" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" uuid NOT NULL,
	"escritorio_id" uuid NOT NULL,
	"status_anterior" varchar(20),
	"status_novo" varchar(20) NOT NULL,
	"origem" varchar(20) DEFAULT 'MANUAL' NOT NULL,
	"usuario_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usuario" ADD CONSTRAINT "usuario_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comarca" ADD CONSTRAINT "comarca_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reu" ADD CONSTRAINT "reu_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reu_alias" ADD CONSTRAINT "reu_alias_reu_id_reu_id_fk" FOREIGN KEY ("reu_id") REFERENCES "public"."reu"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processo" ADD CONSTRAINT "processo_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processo" ADD CONSTRAINT "processo_reu_id_reu_id_fk" FOREIGN KEY ("reu_id") REFERENCES "public"."reu"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processo" ADD CONSTRAINT "processo_parceiro_id_parceiro_id_fk" FOREIGN KEY ("parceiro_id") REFERENCES "public"."parceiro"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracao_pendente" ADD CONSTRAINT "extracao_pendente_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracao_pendente" ADD CONSTRAINT "extracao_pendente_revisado_por_usuario_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracao_pendente" ADD CONSTRAINT "extracao_pendente_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pendencia" ADD CONSTRAINT "pendencia_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pendencia" ADD CONSTRAINT "pendencia_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pendencia_historico" ADD CONSTRAINT "pendencia_historico_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pendencia_problema" ADD CONSTRAINT "pendencia_problema_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "escritorio_adversario" ADD CONSTRAINT "escritorio_adversario_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "escritorio_adversario_alias" ADD CONSTRAINT "escritorio_adversario_alias_escritorio_adversario_id_escritorio_adversario_id_fk" FOREIGN KEY ("escritorio_adversario_id") REFERENCES "public"."escritorio_adversario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "advogado_adversario" ADD CONSTRAINT "advogado_adversario_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "advogado_adversario" ADD CONSTRAINT "advogado_adversario_escritorio_adversario_id_escritorio_adversario_id_fk" FOREIGN KEY ("escritorio_adversario_id") REFERENCES "public"."escritorio_adversario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "advogado_adversario_alias" ADD CONSTRAINT "advogado_adversario_alias_advogado_adversario_id_advogado_adversario_id_fk" FOREIGN KEY ("advogado_adversario_id") REFERENCES "public"."advogado_adversario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vara_documento_regra" ADD CONSTRAINT "vara_documento_regra_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processo_reprotocolo" ADD CONSTRAINT "processo_reprotocolo_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processo_reprotocolo" ADD CONSTRAINT "processo_reprotocolo_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processo_reprotocolo" ADD CONSTRAINT "processo_reprotocolo_processo_novo_id_processo_id_fk" FOREIGN KEY ("processo_novo_id") REFERENCES "public"."processo"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feriado" ADD CONSTRAINT "feriado_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencia" ADD CONSTRAINT "audiencia_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencia" ADD CONSTRAINT "audiencia_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencia" ADD CONSTRAINT "audiencia_escritorio_adversario_id_escritorio_adversario_id_fk" FOREIGN KEY ("escritorio_adversario_id") REFERENCES "public"."escritorio_adversario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencia" ADD CONSTRAINT "audiencia_advogado_adversario_id_advogado_adversario_id_fk" FOREIGN KEY ("advogado_adversario_id") REFERENCES "public"."advogado_adversario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencia_historico" ADD CONSTRAINT "audiencia_historico_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencia_lixeira" ADD CONSTRAINT "audiencia_lixeira_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencia_ausente" ADD CONSTRAINT "audiencia_ausente_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencia_ausente" ADD CONSTRAINT "audiencia_ausente_audiencia_id_audiencia_id_fk" FOREIGN KEY ("audiencia_id") REFERENCES "public"."audiencia"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencia_ausente" ADD CONSTRAINT "audiencia_ausente_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comunicacao" ADD CONSTRAINT "comunicacao_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comunicacao" ADD CONSTRAINT "comunicacao_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comunicacao" ADD CONSTRAINT "comunicacao_pendencia_gerada_id_pendencia_id_fk" FOREIGN KEY ("pendencia_gerada_id") REFERENCES "public"."pendencia"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oab_escuta" ADD CONSTRAINT "oab_escuta_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "capturas_log" ADD CONSTRAINT "capturas_log_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fontes_saude" ADD CONSTRAINT "fontes_saude_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_tenant_id_escritorio_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_usuario_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_quota" ADD CONSTRAINT "ai_quota_tenant_id_escritorio_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "procedente_transicao" ADD CONSTRAINT "procedente_transicao_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "procedente_transicao" ADD CONSTRAINT "procedente_transicao_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "procedente_transicao" ADD CONSTRAINT "procedente_transicao_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processo_procedente" ADD CONSTRAINT "processo_procedente_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processo_procedente" ADD CONSTRAINT "processo_procedente_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sentenca" ADD CONSTRAINT "sentenca_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sentenca" ADD CONSTRAINT "sentenca_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "embargos_declaracao" ADD CONSTRAINT "embargos_declaracao_sentenca_id_sentenca_id_fk" FOREIGN KEY ("sentenca_id") REFERENCES "public"."sentenca"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "embargos_declaracao" ADD CONSTRAINT "embargos_declaracao_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "embargos_declaracao" ADD CONSTRAINT "embargos_declaracao_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tutela_antecipada" ADD CONSTRAINT "tutela_antecipada_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tutela_antecipada" ADD CONSTRAINT "tutela_antecipada_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processo_sucessor" ADD CONSTRAINT "processo_sucessor_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processo_sucessor" ADD CONSTRAINT "processo_sucessor_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parceiro" ADD CONSTRAINT "parceiro_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parceiro_materia" ADD CONSTRAINT "parceiro_materia_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parceiro_materia" ADD CONSTRAINT "parceiro_materia_parceiro_id_parceiro_id_fk" FOREIGN KEY ("parceiro_id") REFERENCES "public"."parceiro"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processo_producao_probatoria" ADD CONSTRAINT "processo_producao_probatoria_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processo_producao_probatoria" ADD CONSTRAINT "processo_producao_probatoria_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fase_historico" ADD CONSTRAINT "fase_historico_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fase_historico" ADD CONSTRAINT "fase_historico_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fase_historico" ADD CONSTRAINT "fase_historico_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "improcedente" ADD CONSTRAINT "improcedente_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "improcedente" ADD CONSTRAINT "improcedente_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "status_historico" ADD CONSTRAINT "status_historico_processo_id_processo_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "status_historico" ADD CONSTRAINT "status_historico_escritorio_id_escritorio_id_fk" FOREIGN KEY ("escritorio_id") REFERENCES "public"."escritorio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "status_historico" ADD CONSTRAINT "status_historico_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_processo_escritorio_status" ON "processo" USING btree ("escritorio_id","status_processo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_processo_escritorio_fase" ON "processo" USING btree ("escritorio_id","fase_atual");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_processo_escritorio_updated" ON "processo" USING btree ("escritorio_id","updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pendencia_escritorio_status" ON "pendencia" USING btree ("escritorio_id","status","data_limite");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pendencia_processo" ON "pendencia" USING btree ("processo_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vara_doc_regra_escritorio" ON "vara_documento_regra" USING btree ("escritorio_id","vara");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notificacao_escritorio" ON "notificacao" USING btree ("escritorio_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audiencia_escritorio_data" ON "audiencia" USING btree ("escritorio_id","data");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audiencia_status" ON "audiencia" USING btree ("escritorio_id","status","data");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comunicacao_escritorio_created" ON "comunicacao" USING btree ("escritorio_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comunicacao_status_created" ON "comunicacao" USING btree ("escritorio_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comunicacao_hash" ON "comunicacao" USING btree ("escritorio_id","hash_externo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comunicacao_processo" ON "comunicacao" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sentenca_processo" ON "sentenca" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sentenca_escritorio" ON "sentenca" USING btree ("escritorio_id","data");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fase_historico_processo" ON "fase_historico" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_status_historico_processo" ON "status_historico" USING btree ("processo_id");