-- migration_schema
-- 
-- Basic setup for OSCI migrated content and target migration tables 

--   * `documents` - mostly a JSON inbox for inbound migrated docs
CREATE TABLE IF NOT EXISTS documents (  id TEXT, 
										package TEXT, 
										type TEXT, 
										format TEXT, 
										title TEXT,
										error TEXT, 
										data JSON );

--   * `publications` - individual publication metadata (osci packages)
CREATE TABLE IF NOT EXISTS publications (pub_id TEXT, data JSON);

--   * `tocs` - individual publication metadata (osci "nav"s)
CREATE TABLE IF NOT EXISTS tocs (toc_id TEXT, data JSON);

--   * `texts` - any landable non-Table-of-Contents OSCI page (osci "texts"s and "entry"s)
-- TODO: `url` and `reader_url`										
CREATE TABLE IF NOT EXISTS texts ( text_id TEXT, 
								   blocks JSON, 
								   figures JSON, 
								   footnotes JSON,
								   error TEXT, 
								   data JSON );

--   * `figure_layers` - data sources for in-text figures (osci "figure"s)
CREATE TABLE IF NOT EXISTS figure_layers (layer_id TEXT, data JSON);

CREATE INDEX doc_idx ON documents (id);
CREATE INDEX doc_typ ON documents (type); 
CREATE INDEX doc_url ON documents (data->>'$._url'); 
CREATE INDEX doc_pkg ON documents (package);
