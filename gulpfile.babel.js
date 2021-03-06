'use strict';

import gulp from 'gulp';
import path from 'path';
import gulpLoadPlugins from 'gulp-load-plugins';
import filenames from 'gulp-filenames';
import toPascalCase from 'to-pascal-case';
import changeCase from 'change-case';
import del from 'del';

const $ = gulpLoadPlugins({});
const PREFIX = '';
const CLASSNAME = 'glyphs';

let spawn = require('child_process').spawn;
let fileList = [];

function cap(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

gulp.task('svg', () =>
  gulp.src('./svg/**/*.svg')
    .pipe(filenames("svg"))
    .pipe($.svgmin((file) => {
      let name = path.basename(file.relative, path.extname(file.relative));

      return {
        plugins:[
          {removeDoctype: true},
          {addAttributesToSVGElement: { attribute: 'classNameString' }},
          {removeTitle: true},
          {removeStyleElement: true},
          {removeAttrs: { attrs: ['id', 'class', 'data-name', 'fill'] }},
          {removeEmptyContainers: true},
          {sortAttrs: true},
          {removeUselessDefs: true},
          {removeEmptyText: true},
          {removeEditorsNSData: true},
          {removeEmptyAttrs: true},
          {removeHiddenElems: true},
          {collapseGroups: false},
        ]
      }
    }))

    .pipe($.insert.transform((content, file) => {
      let name = toPascalCase(cap(path.basename(file.relative, path.extname(file.relative))));

      fileList = filenames.get("svg");

      let component = `
      import React, { Component } from 'react';

      export default class ${name}${PREFIX} extends Component {
        static defaultProps = {
          className: ''
        };

        constructor(props) {
          super(props);
        }

        render() {
          return (
            ${content}
          )
        }
      }`;

      return component;
    }))
    .pipe($.extReplace('.js'))
    .pipe($.rename((path) => {
      path.basename = `${toPascalCase(cap(path.basename))}${PREFIX}`
    }))
    .pipe(gulp.dest('./dist'))
)

gulp.task('replace', () => {
  return gulp.src('./dist/*.js')
    .pipe($.tap((file) => {
      let fileName = path.basename(file.path);
      let className = changeCase.lowerCase(changeCase.headerCase(fileName.replace('.js', '')));

      return gulp.src('./dist/' + fileName)
        .pipe($.replace(
          "classNameString",
          `{...this.props} className={\`${CLASSNAME} ${CLASSNAME}-${className} \${this.props.className\}\`}`
        ))
        .pipe($.replace(/xmlns:xlink=".+?"/g, ``))
        .pipe($.replace(/xlink:href=".+?"/g, ``))
        .pipe($.replace("fill-rule=", "fillRule="))
        .pipe($.replace("stop-color=", "stopColor="))
        .pipe(gulp.dest('./dist'));
    }));
});

gulp.task('clear', (cb) => {
  del(['dist']);
  return cb();
});

gulp.task('gulp-reload', () => {
  spawn('./node_modules/.bin/gulp', ['default'], {stdio: 'inherit'});
  process.exit();
});

gulp.task('watch', () => {
  gulp.watch('gulpfile.babel.js', gulp.series('gulp-reload'));
});

gulp.task('build', gulp.series(
  'clear', 'svg', 'replace'
))

gulp.task('default', gulp.series(
  'build', 'watch'
))
