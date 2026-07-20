-- A tabela `contacts` guardava uma linha por contato de cada lista (até
-- dezenas de milhares de linhas por campanha), mas nada no sistema lê essa
-- tabela: os contadores de total/válido/inválido já são calculados em
-- memória no parse do CSV (ver contact_lists), e o arquivo original é
-- entregue ao n8n via URL assinada do Storage, não a partir do banco.
-- Persistir contato por contato só inchava o Postgres sem consumidor real.
drop table if exists public.contacts;
