# i18npack
Packs multiple i18n files into a single JSON file.

Most tools that work with i18n data expect translations to be separated by language. i18npack allows you to keep translations for all languages in the same file so you can glance at all translations without switching to another file. It's based on [js-yaml](https://github.com/nodeca/js-yaml) and thus only supports YAML files as source.

## Installation
```sh
npm install i18npack
```

## Usage

```javascript
var i18npack = require('i18npack');

// Use a glob pattern to specify files
i18npack.generate('translations/**/*.yaml', options);

// ...or pass an array of file names. options is optional.
i18npack.generate(['file1.yaml', 'file2.yaml']);

// Set default options if you don't want to pass it each time.
i18npack.settings.languages = ['en'. 'fr'];

// ...and you can reset options later if necessary.
i18npack.reset();
```

i18npack supports glob patterns. See [glob](https://github.com/isaacs/node-glob) documentation.

## Examples

Given these two source files and option `{ languages: ['en', 'fr'] }`,

bio.yaml
```yaml
name: "John Smith"
job: !t
  - "engineer"
  - "ingénieur"

```

pages.yaml
```yaml
index:
  pageTitle: !t
    - "My Website"
    - "Mon site web"
  url: "http://www.mywebsite.com"

```

they are transformed into:

en.json
```json
{
  "bio": {
    "name": "John Smith",
    "job": "engineer"
  },
  "pages": {
    "index": {
      "pageTitle": "My Website",
      "url": "http://www.mywebsite.com"
    }
  }
}
```

fr.json
```json
{
  "bio": {
    "name": "John Smith",
    "job": "ingénieur"
  },
  "pages": {
    "index": {
      "pageTitle": "Mon site web",
      "url": "http://www.mywebsite.com"
    }
  }
}
```

### Language Keys

If there are many languages, it may be convenient to prefix each translation
by a language code. These codes need to be the same ones specified in `options`.

```yaml
greetingText: !t
  - en: Welcome!
  - fr: Bienvenue!
  - da: Velkommen!
  - ja: ようこそ！
```

### i18npack YAML Types

i18npack uses several built-in cusyom YAML types to help you organize strings better.

#### !t

Takes a list of scalars and selects one that corresponds to the current language being generated.

See examples above.

#### !struct

Takes a specified JSON schema and validates a block against the schema using [tv4](https://github.com/geraintluff/tv4). To specifiy a schema, use `_schema` in the source and specify the name of the file containing it. If you are unfamilier with JSON schema Draft v4, try using [http://jsonschema.net](http://jsonschema.net) to generate it.

book.yaml
```yaml
book: !struct
  _schema: book.json
  title: Alice's Adventures in Wonderland
  auothor: Lewis Carroll
```

book.json
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "title": {
      "type": "string"
    },
    "auothor": {
      "type": "string"
    }
  },
  "required": [
    "title",
    "auothor"
  ]
}
```

#### !extend

Reads a YAML file and [_.extend](https://lodash.com/docs#assign)s the current block with the file content.

```yaml
book: !extend
  _base: book.yaml
  published: 1865
```

Result:
```json
{
  "book": {
    "title": "Alice's Adventures in Wonderland",
    "auothor": "Lewis Carroll",
    "published": 1856
  }
}
```

### Custom YAML Types

You can also specify your own YAML types. See [js-yaml](https://github.com/nodeca/js-yaml) documentation for more details.

```javascript
var options = {
  customTypes: {
    '!greet scalar': function(value) {
      return 'Hello, ' + value + '!';
    },
    '!max sequence': function(values) {
      return Math.max.apply(null, values);
    }
  }
};

i18npack.generate('test.yaml', options);
```

test.yaml
```yaml
msg: !greet John Smith
maxValue: !max
  - 10
  - 5
  - 21
  - 5
foo: !!str 123
bar: 123
```

Result:

```json
{
  "test": {
    "msg": "Hello, John Smith!",
    "maxValue": 21,
    "foo": "123",
    "bar": 123
  }
}
```

### Using Templates

It is possible to reference a value from any source files so you don't need to repeat the same values in many places. [JSON Query](https://github.com/mmckegg/json-query) is supported in i18npack to make this possible. To use it, enclose the query in the `{{ }}` delimiter:

bio.yaml
```yaml
name: "John Smith",
homepage: "{{ pages.index.url }}"
```

pages.yaml
```yaml
index:
  url: "http://www.mywebsite.com"
```

Result:

```yaml
bio:
  name: "John Smith"
  homepage: "http://www.mywebsite.com"
pages:
  index:
    url: "http://www.mywebsite.com"
```

## Options

You can override the default options as follows so you don't need to pass the option object each time. If you need to reset changes, use `i18npack.reset()`.

```javascript
i18npack.settings.dest = 'data/translations';
```

### languages
Type: `array`
Default: `['en']`

An array of supported languages.

### dest
Type: `string`
Default: `'.'`

The path of a destination directory.

### schemaDir
Type: `string`
Default: `'.'`

The directory containing schemas for source files.

### delimiter
Type: `RegExp` object
Default: `/{{([\s\S]+?)}}/g`

The delimiter used for processing templates. It must have one regex group and the global flag `g`.

### customTypes
Type: `object`
Default: `{}`

An object of key-value pairs containing custom YAML types. See [js-yaml](https://github.com/nodeca/js-yaml) documentation for more details.

### strict
Type: `boolean`
Default: `false`

If true, an error is thrown if all translations are not provided. An empty string is inserted for missing translations, otherwise.

### ext
Type: `string`
Default: `'.json'`

The file extension of output files.