-- =============================================
-- StyleFind: начальная схема базы данных
-- 5 таблиц: sessions, search_results, capsules, capsule_items, bot_logs
-- =============================================

-- Функция обновления updated_at (используется триггерами)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- sessions — состояние диалога стилиста с ботом
-- =============================================
CREATE TABLE sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id      BIGINT      NOT NULL UNIQUE,
  state            TEXT        NOT NULL DEFAULT 'idle',
  -- idle | waiting_segment | searching | browsing_results | building_capsule
  current_query    JSONB       DEFAULT '{}',
  -- { "type": "photo|text", "item_type": "...", "color": "...", "style": "...", "additional_details": "..." }
  current_segment  TEXT        DEFAULT 'mid',
  -- mass | mid | premium
  current_client_name TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_telegram_id ON sessions(telegram_id);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_sessions" ON sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE sessions IS 'Состояние диалога стилиста с ботом. Одна запись на пользователя.';

-- =============================================
-- search_results — результаты последнего поиска
-- =============================================
CREATE TABLE search_results (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT      NOT NULL,
  session_id  UUID        REFERENCES sessions(id) ON DELETE CASCADE,
  product_id  TEXT        NOT NULL,
  source      TEXT        NOT NULL CHECK (source IN ('wildberries', 'lamoda')),
  name        TEXT        NOT NULL,
  price       INTEGER     NOT NULL,  -- в рублях
  url         TEXT        NOT NULL,
  image_url   TEXT        NOT NULL,
  raw_data    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_results_telegram ON search_results(telegram_id);
CREATE INDEX idx_search_results_product  ON search_results(product_id, source);

ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_search_results" ON search_results
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE search_results IS 'Результаты последнего поиска. Очищаются при новом поиске.';

-- =============================================
-- capsules — капсулы стилиста по клиентам
-- =============================================
CREATE TABLE capsules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT      NOT NULL,
  client_name TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exported')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_capsules_telegram ON capsules(telegram_id);
CREATE INDEX idx_capsules_client   ON capsules(telegram_id, client_name);

ALTER TABLE capsules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_capsules" ON capsules
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER capsules_updated_at
  BEFORE UPDATE ON capsules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE capsules IS 'Подборки вещей по клиентам стилиста.';

-- =============================================
-- capsule_items — товары внутри капсулы
-- =============================================
CREATE TABLE capsule_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id  UUID        NOT NULL REFERENCES capsules(id) ON DELETE CASCADE,
  telegram_id BIGINT      NOT NULL,
  source      TEXT        NOT NULL CHECK (source IN ('wildberries', 'lamoda')),
  product_id  TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  price       INTEGER     NOT NULL,  -- в рублях
  url         TEXT        NOT NULL,
  image_url   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_capsule_items_capsule  ON capsule_items(capsule_id);
CREATE INDEX idx_capsule_items_telegram ON capsule_items(telegram_id);

ALTER TABLE capsule_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_capsule_items" ON capsule_items
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE capsule_items IS 'Товары добавленные стилистом в капсулу клиента.';

-- =============================================
-- bot_logs — лог всех запросов для мониторинга
-- =============================================
CREATE TABLE bot_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT,
  action      TEXT        NOT NULL,
  -- gemini_analysis | wb_search | lamoda_search | pdf_generate | add_to_capsule | error
  input       JSONB       DEFAULT '{}',
  output      JSONB       DEFAULT '{}',
  duration_ms INTEGER,
  error       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bot_logs_created  ON bot_logs(created_at DESC);
CREATE INDEX idx_bot_logs_telegram ON bot_logs(telegram_id);
CREATE INDEX idx_bot_logs_error    ON bot_logs(error) WHERE error IS NOT NULL;

ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_bot_logs" ON bot_logs
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE bot_logs IS 'Лог всех операций бота: Gemini, поиск, PDF, ошибки.';
