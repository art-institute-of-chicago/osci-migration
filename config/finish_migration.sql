-- TODO: Apply some FK constraints.

-- This is just to get us closer to a web-safe DB size (~50MB at time of writing) since the whole thing gets loaded
UPDATE documents 
SET data = json_set(json_set(data,'$._body_html',''),'$._body_text','') 
WHERE data->>'$._body_html' is not null; 

CREATE INDEX doc_idx ON documents (id);
CREATE INDEX doc_typ ON documents (type); 
CREATE INDEX doc_url ON documents (json_extract(data,'$._url')); 
CREATE INDEX doc_pkg ON documents (package);

-- TODO: use these tables in the review app

INSERT INTO texts (text_id, package, title, blocks, figures, footnotes, error, data)
SELECT id,package,title,data->>'$.blocks',data->>'$.figures',data->>'$.footnotes',error,data 
FROM documents WHERE type='text' OR type is null;

CREATE INDEX txt_id ON texts (text_id);
CREATE INDEX txt_url ON texts (json_extract(data,'$._url')); 
CREATE INDEX txt_pkg ON texts (package);

INSERT INTO tocs (toc_id, package, title, error, data)
SELECT id,package,title,error,data 
FROM documents WHERE type='toc';

CREATE INDEX tocs_id ON tocs (toc_id);
CREATE INDEX tocs_url ON tocs (json_extract(data,'$._url')); 
CREATE INDEX tocs_pkg ON tocs (package);

INSERT INTO publications (pub_id, package, title, data)
SELECT id,package,title,data 
FROM documents WHERE type='osci-package';

CREATE INDEX pubs_id ON publications (pub_id);
CREATE INDEX pubs_url ON publications (json_extract(data,'$._url')); 
CREATE INDEX pubs_pkg ON publications (package);

INSERT INTO figure_layers (layer_id, package, title, error, data)
SELECT id,package,title,error,data 
FROM documents WHERE type='figure';

DROP TABLE documents;

VACUUM; 
PRAGMA optimize;

-- NB: `sqlite3-wasm` can't open WAL mode 🫠
PRAGMA journal_mode=delete;
