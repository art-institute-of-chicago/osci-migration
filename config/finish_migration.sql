-- TODO: Apply some FK constraints.

-- This is just to get us closer to a web-safe DB size (~50MB at time of writing) since the whole thing gets loaded
UPDATE documents 
SET data = json_set(json_set(data,'$._body_html',''),'$._body_text','') 
WHERE data->>'$._body_html' is not null; 

VACUUM; 
PRAGMA optimize;

-- TODO: use these tables in the review app

-- INSERT INTO texts (text_id, package, blocks, figures, footnotes, data)
-- SELECT id,package,'[]',data->>'$.figures',data->>'$.footnotes', data 
-- FROM documents WHERE type='text';

-- INSERT INTO tocs (toc_id, package, data)
-- SELECT id,package,data 
-- FROM documents WHERE type='toc';

-- INSERT INTO publications (pub_id, package, data)
-- SELECT id,package,data 
-- FROM documents WHERE type='osci-package';

-- INSERT INTO figure_layers (layer_id, package, data)
-- SELECT id,package,'{}' 
-- FROM documents WHERE type='figure';

CREATE INDEX doc_idx ON documents (id);
CREATE INDEX doc_typ ON documents (type); 
CREATE INDEX doc_url ON documents (data->>'$._url'); 
CREATE INDEX doc_pkg ON documents (package);

-- NB: `sqlite3-wasm` can't open WAL mode 🫠
PRAGMA journal_mode=delete;
