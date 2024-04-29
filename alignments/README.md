# HTML Alignments

The files in `./alignments` are meant to be run in benthos piplines via `command` or `subprocess`. Most do simple `querySelector` things via `jsdom`.

Each script takes input from STDIN (separated by newlines in the case of `subprocess`), outputs JSON on STDOUT, and puts errors on STDERR. The script shouldn't open any other file handles or do any other IO if possible.

All javascript _must_ serialize to JSON before writing to process.stdout so that the receiving processor can correctly handle embedded newlines, will not emit extra newlines via `console.log()`, etc.  