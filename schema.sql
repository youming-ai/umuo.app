-- umuo-app D1 数据库结构
-- 创建时间: 2024-01-29
-- 描述: 语言学习应用的数据持久化层

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  preferences TEXT, -- JSON 格式存储用户偏好设置
  subscription_tier TEXT DEFAULT 'free', -- free, premium
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 文件表
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  duration_seconds INTEGER, -- 音频时长
  language_code TEXT DEFAULT 'zh-CN', -- 语言代码
  r2_key TEXT, -- R2 存储的文件键
  transcription_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  ai_provider TEXT DEFAULT 'groq', -- groq, openai
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 转录结果表
CREATE TABLE IF NOT EXISTS transcriptions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  content TEXT NOT NULL,
  word_timestamps TEXT, -- JSON 格式存储词级时间戳
  confidence_score REAL,
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  cost_cents INTEGER, -- 成本（分）
  language_detected TEXT,
  model_used TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- 学习记录表
CREATE TABLE IF NOT EXISTS learning_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  session_type TEXT DEFAULT 'shadowing', -- shadowing, listening, reading
  progress_percentage REAL DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  words_practiced INTEGER DEFAULT 0,
  accuracy_score REAL,
  session_data TEXT, -- JSON 格式存储详细会话数据
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- 系统统计表
CREATE TABLE IF NOT EXISTS usage_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  files_processed INTEGER DEFAULT 0,
  transcription_minutes INTEGER DEFAULT 0,
  learning_sessions INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date)
);

-- 创建索引以提高查询性能
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_status ON files(transcription_status);
CREATE INDEX idx_files_created_at ON files(created_at);
CREATE INDEX idx_transcriptions_file_id ON transcriptions(file_id);
CREATE INDEX idx_learning_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX idx_learning_sessions_file_id ON learning_sessions(file_id);
CREATE INDEX idx_usage_stats_user_date ON usage_stats(user_id, date);

-- 插入一些基础数据
INSERT OR IGNORE INTO users (id, email, username, preferences) VALUES
('demo-user-id', 'demo@umuo.app', 'demo-user', '{"theme": "dark", "language": "zh-CN", "autoTranscribe": true}');

-- 更新 wrangler.toml 配置中的数据库 ID
-- 将以下配置添加到 wrangler.toml:
-- [[d1_databases]]
-- binding = "DB"
-- database_name = "umuo-app-db"
-- database_id = "5900e9a3-d502-43fb-9aac-a80f997d8f42"
