

class Texture
{

    constructor( texturePath, isHDR, wrap, filter, callback )
    {

        if ( !Texture.nbTextureToLoad ) 
        {
            Texture.nbTextureToLoad = 0;
        }
        Texture.nbTextureToLoad++;

        var image;
        if ( !isHDR )
        {
            image = new Image(); 
        }
        else
        {
            image = new HDRImage();
        }

        image.crossOrigin = "anonymous";

        image.onload = function() 
        {
            var texture = Texture.generateTextureFromData( image, image.width, image.height, isHDR, wrap, filter );
            //console.log("Loaded " + texturePath + " successfully");

            // Keep track of how much there is left to load
            if(!Texture.nbTextureLoaded){
                Texture.nbTextureLoaded = 0;
            }
            Texture.nbTextureLoaded++;

            updateSpinner();

            if(callback){
                callback(texture);
            }
        };
        
        image.onerror = function() 
        {
            console.log("Couldn't load " + texturePath);   
        };
        
        image.src = texturePath; // execute the test
    }

    /**
     * 픽셀데이터로 부터 직접 텍스쳐객체 생성
     * @param {*} data 
     * @param {*} width 
     * @param {*} height 
     * @param {*} isHDR 
     * @param {*} wrap gl.REPEAT
     * @param {*} filter gl.NEAREST
     * @returns {WebGLTexture}
     */
    static generateTextureFromData( data, width, height, isHDR, wrap=gl.REPEAT, filter=gl.NEAREST )
    {
        var texture = gl.createTexture();
        gl.bindTexture( gl.TEXTURE_2D, texture );
        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true );
        // set the texture wrapping/filtering options (on the currently bound texture object)
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter );
        // load and generate the texture
        if ( !isHDR ) 
        {
            gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, data );
            gl.generateMipmap( gl.TEXTURE_2D );
        } 
        else 
        {
            gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB16F, width, height, 0, gl.RGB, gl.FLOAT, data.dataFloat )
        }
        gl.bindTexture( gl.TEXTURE_2D, null );

        return texture;
    }

    /**
     * generate a 1*1 pixel white texture
     */
    static loadDefaultTexture()
    {            
        // Generate a 1*1 pixel white texture
        Texture.defaultTexture = Texture.generateTextureFromData( new Uint8Array( [ 255.0, 255.0, 255.0 ] ), 1, 1, false, gl.REPEAT, gl.NEAREST );
    }
}