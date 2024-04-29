![Art Institute of Chicago](https://raw.githubusercontent.com/Art-Institute-of-Chicago/template/master/aic-logo.gif)

# OSCI Migration Tooling

This repo contains a [benthos](https://benthos.dev) pipeline and some javascript functions for fetching, unpacking, and creating JSON for an OSCI publication from its manifest file. Everything listed in the manifest is fetched, given a package-scoped URI, transformed a bit, and then streamed into a sqlite database for going some other cool place.

## Features

* Downloads everything necessary to recreate the publication content in a CMS
* Transforms markup-embedded OSCI data (eg, figures, image layers, footnotes, and TOC) into JSON

## Overview

The pipeline itself is composed of a `benthos` pipeline that takes OSCI epub `.opf` package URLs as inputs and processes them in stages to download and unpack the entire publication and add some useful JSON metadata.

Each stage of the pipeline receives a JSON message as its input (starting with a message like `{"renoir": "http://example.org/publication/renoirart/package.opf"}`, modifies the message or fetches more data to attach to the message, and emits that to the next processor. At the end the messages are streamed into a sqlite3 database for review and migration to the target CMS.   

When the pipeline runs, the following happens in batches of message streams:
- Fetch the `.opf` package URL
- Turn the returned XML into JSON
- Grab some package metadata for the publication (title, identifier URN, etc)
- "Unarchive" the manifest's `spine` contents so they are treated as messages of their own in the processor.
- Fetch each of the `spine` items and cache the response in `data/osci_url_cache.sqlite3`
- Process each message according to its type (TOC, contribution, entry, etc) and provide JSON data structures for data embedded in OSCI as markup (eg, figure@data-options tags that carry figure crop boxes)
- Insert into a database at `output/migration.sqlite3`
- TODO: A migration script transforms the single-table `documents` table into CMS-aligned tables w/ FKs, blocks, etc.

## Requirements

- Benthos 4.26.0 (this is a hard requirement r/n: 4.27.0 adds some YAML strictness--FIXME!)
- node 21.7.3 (probably works with anything v18+)
- npm 10.5.0 (though probably works with earlier)

## Installing

- Install benthos
`benthos` installs as a single static binary, either in a location globally on your machine or in your proejct directory. To install via hombrew:

```shell
# Update homebrew + install benthos binary
brew update
brew install benthos@4.26.0
```

If you need to use the pipline in an individual directory where you have execute permissions, in a container, etc, see [their install guide](https://www.benthos.dev/docs/guides/getting_started) for more info on install via `curl`, `asdf`, `docker`, etc.

- Install javascript dependencies
Run `npm install` in the project root directory

## Developing

Run the pipeline:

```shell
git clone https://github.com/art-institute-of-chicago/osci-migration.git
cd osci-migration/
brew install benthos # If not already installed
npm install # If not run once already
benthos -c config/migration.yaml
```

This will:
- Clone the migration repo
- Install benthos
- Run the pipeline to unpackage OSCI publications and put a database with the results in `output/migrated.sqlite3`

For more on the actual pipeline stages and how to modify it, see [Configuration](#configuration).

### Running

- TODO: Describe any settable env vars that make things happen (eg, LOG_LEVEL, LOG_TYPE, etc)

## Deploying / Publishing

- TODO: Describe releases or netlify CI/CD and any ceremony needed to make those happen

## Configuration

The majority of the pipeline is constructed in `config/migration.yaml` and some bloblang mapping functions in `config/mappings.blobl`.

### Configuration file path

#### Configuration 1 Name
Type: `String`
Default: `'default value'`

State what it does and how you can use it. If needed, you can provide
an example below.

Example:
```bash
aic-project "Some other value"  # Prints "Hello World"
```

#### Configuration 2 Name
Type: `Number|Boolean`
Default: 100

Copy-paste as many of these as you need.

## Contributing

We encourage your contributions. Please fork this repository and make your changes in a separate branch. To better understand how we organize our code, please review our [version control guidelines](https://docs.google.com/document/d/1B-27HBUc6LDYHwvxp3ILUcPTo67VFIGwo5Hiq4J9Jjw).

```bash
# Clone the repo to your computer
git clone git@github.com:your-github-account/aic-project.git

# Enter the folder that was created by the clone
cd aic-project

# Run the install script
./install.sh

# Start a feature branch
git checkout -b feature/good-short-description

# ... make some changes, commit your code

# Push your branch to GitHub
git push origin feature/good-short-description
```

Then on github.com, create a Pull Request to merge your changes into our
`develop` branch.

This project is released with a Contributor Code of Conduct. By participating in
this project you agree to abide by its [terms](CODE_OF_CONDUCT.md).

We welcome bug reports and questions under GitHub's [Issues](issues). For other concerns, you can reach our engineering team at [engineering@artic.edu](mailto:engineering@artic.edu)

If there's anything else a developer needs to know (e.g. the code style
guide), you should link it here. If there's a lot of things to take into
consideration, separate this section to its own file called `CONTRIBUTING.md`
and say that it exists here.

## Acknowledgements

Name who designed and developed this project. Reference someone's code you used,
list contributors, insert an external link or thank people. If there's a lot to
inclue here, separate this section to its own file called `CONTRIBUTORS.md` and
say that it exists here.

## Licensing

This project is licensed under the [GNU Affero General Public License
Version 3](LICENSE).
