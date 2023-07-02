const path = require( 'path' );
const { webpack, SourceMapDevToolPlugin } = require( 'webpack' );

module.exports = {

    mode: 'development',

    entry: {
        //
        main: './src/main.js'
    },

    output: {
        path: __dirname + '/dist',
        filename: '[name].bundle.js',
        /*filename: function ( pathData, assetInfo )
        {
            // console.log( pathData ); // https://webpack.js.org/configuration/output/#outputfilename
            // console.log( assetInfo );  // all just {}
            const parent   = pathData.chunk.name.substr(0,4);
            const name     = pathData.chunk.name;
            const ext      = '.bundle.js';
            const fileName = path.join( parent, name + ext );
            // console.log( fileName );
            return fileName;
        }*/ 
    },

    devtool: 'source-map',

    plugins: [
        new SourceMapDevToolPlugin( {
            filename: '[file].map',
            append: '\n//# sourceMappingURL=[name].bundle.js.map'
        } )
    ],

    module: {
        rules: [
            {
                test: /\.(glsl|vert|frag|vs|fs)$/,
                exclude: /node_modules/,
                loader: 'webpack-glsl-loader'
            }
        ]
    },

    resolve: {
        extensions: [ 'js', 'ts' ]
    },

    watch: true
}