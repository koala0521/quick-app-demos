var gulp = require('gulp'),
    rename = require('gulp-rename'),
    del = require('del'),  
    uglify_es = require('gulp-uglify-es').default,
    concat = require('gulp-concat'),
    sourcemaps = require("gulp-sourcemaps"),
    browserSync = require('browser-sync').create(),//热更新;
    args = require('yargs').argv,
    path = require("path");


const RV = (...args)=> path.resolve( __dirname , ...args );


var baseDir = "../statistics";


// 基础文件

// var baseFiles = [baseDir + '/aes.js'  , baseDir + '/appStatistics-v3.js' ];

// 版本 1.0.0.0
var baseFiles = [baseDir + '/aes.js'  , baseDir + '/appStatistics-v1.2.0.0.js' ];

// var allFils;

// 各环境对应文件
var config = {
    dev:[
        baseDir + "/dev.config.js"
    ],
    test:[ 
        baseDir + "/test.config.js"
    ],
    prod:[
        baseDir + "/prod.config.js"
    ]
};

// 任务
var tasks = {
    dev(){

        gulp.start(['build']);
    },
    test(){
        gulp.start(['test']);
    },
    prod(){
        gulp.start(['prod']);
    },
};

function init(){
    var env = args.env || 'dev';
    var f = config[env] || [];
    console.log( env );
    
    return f.concat( baseFiles )
}

gulp.task('default',['delete'] , function() {
    var env = args.env || 'dev';
    // 执行任务
    tasks[env] && tasks[env]();
    gulp.start(['configFile']);
});


// 生产打包
gulp.task('build' , ['con'], ()=>{

    gulp.start(['ugl']);

});

// 测试打包
gulp.task('test',function(){  

    // 合并依赖
    let allFils = init();

    return gulp.src( allFils )
        .pipe(concat('appStatistics.js'))
        .pipe( rename({ extname: '.min.js' }) )        
        .pipe( sourcemaps.init() )
        .pipe( uglify_es(/* options */) )        
        .pipe( sourcemaps.write("./") ) 
        .pipe(gulp.dest('./dist'));
}) 

// 沙盒打包
gulp.task('prod',function(){  
    // 合并依赖
    let allFils = init();

    return gulp.src( allFils )
        .pipe(concat('appStatistics.js'))
        .pipe( rename({ extname: '.min.js' }) )        
        .pipe( sourcemaps.init() )
        .pipe( uglify_es() )        
        .pipe( sourcemaps.write("./") ) 
        .pipe(gulp.dest('./dist'));
}) 

// 配置文件打包
gulp.task('configFile' , function(){
    return gulp.src( baseDir + '/statistics.config.js' )
        .pipe(gulp.dest('./dist'));

});


// 删除dist
gulp.task('delete',function(cb){  
    return del(['dist/*'],cb);  
}) 


// 合并
gulp.task("con",function(){
    // 合并依赖
    let allFils = init();

    return gulp.src( allFils )
        .pipe(concat('appStatistics.js'))      
        .pipe(gulp.dest('./dist'));
});

// 压缩
gulp.task("ugl",function(){

    return gulp.src( "./dist/appStatistics.js" )
        .pipe( rename({ extname: '.min.js' }) )        
        .pipe( sourcemaps.init() )
        .pipe( uglify_es(/* options */) )        
        .pipe( sourcemaps.write("./") ) 
        .pipe(gulp.dest('./dist'));
});


// 压缩 ES6语法
gulp.task( "uglify" , function () {
    return gulp.src("../src/appStatistics.js")
        .pipe( rename({ extname: '.min.js' }) )        
        .pipe( sourcemaps.init() )
        .pipe( uglify_es(/* options */) )        
        .pipe( sourcemaps.write("./") ) 
        .pipe( gulp.dest('./dist') )
});

gulp.task("watch",()=>{

    gulp.start('default');    
    //监控文件变化，自动打包 
    gulp.watch("../src/statistics/*.js", ['default']);

})

