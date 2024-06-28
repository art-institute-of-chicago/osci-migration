-- migration_schema
-- 
-- Basic setup for OSCI migrated content and target migration tables 

--   * `documents` - mostly a JSON inbox for inbound migrated docs
CREATE TABLE IF NOT EXISTS documents (  id TEXT UNIQUE ON CONFLICT REPLACE, 
                                        package TEXT, 
                                        type TEXT, 
                                        format TEXT, 
                                        title TEXT,
                                        error TEXT, 
                                        data JSON );

--   * `publications` - individual publication metadata (osci packages)
CREATE TABLE IF NOT EXISTS publications ( pub_id TEXT,
                                          package TEXT, 
                                          title TEXT,
                                          data JSON );

--   * `tocs` - individual publication metadata (osci "nav"s)
CREATE TABLE IF NOT EXISTS tocs ( toc_id TEXT, 
                                  package TEXT,
                                  title TEXT,
                                  error TEXT,
                                  data JSON );

--   * `texts` - any landable non-Table-of-Contents OSCI page (osci "texts"s and "entry"s)
-- TODO: `url` and `reader_url`                                     
CREATE TABLE IF NOT EXISTS texts ( text_id TEXT,
                                   package TEXT, 
                                   title TEXT,
                                   blocks JSON, 
                                   figures JSON, 
                                   footnotes JSON,
                                   error TEXT,
                                   data JSON );

--   * `figure_layers` - data sources for in-text figures (osci "figure"s)
CREATE TABLE IF NOT EXISTS figure_layers ( layer_id TEXT, 
                                           package TEXT,
                                           title TEXT,
                                           error TEXT,
                                           data JSON );
