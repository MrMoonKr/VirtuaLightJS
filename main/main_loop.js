/// <reference path="../utils/glUtils.js" />
/// <reference path="./gui.js" />
/// <reference path="./inputs.js" />
/// <reference path="./startup.js" />


var scene = {mode : 4};
var depthVP;

/**
 * 전체 씬 렌더링 함수. ( 메인루프, 하트비팅 )
 */
function drawScene()
{
    stats.begin();

    // mvMatrix contains the position of the camera, move it here
    if ( camera.shouldSetup )
    {
        camera.setup();
        camera.shouldSetup = false;
    }

    // Pass 1: Render depth map   
    computeDepthMap(); 

    // Pass 2: Render lighting
    render();

    // Pass 3: Render Skybox
    if ( skybox.program )
    {
        drawSkybox();
    }

    stats.end();

    requestAnimationFrame( drawScene ); // 메인루핑, 하트비팅
}

function computeDepthMap()
{
    gl.useProgram( depthProgram );
    
    gl.cullFace( gl.FRONT ); // Activate front face culling to remove shadowmaps artifacts

    // Generate light view-projection matrix
    var idx                 = lights.length - 1;
    var lightSpaceMatrix    = makeLookAt( lights[ idx ].position.e( 1 ), lights[ idx ].position.e( 2 ), lights[ idx ].position.e( 3 ),
                                          0.0, 0.0, 0.0,
                                          0.0, 1.0, 0.0 );

    depthVP = camera.orthoProj.multiply( lightSpaceMatrix );

    gl.viewport( 0, 0, shadowSize.SHADOW_WIDTH, shadowSize.SHADOW_HEIGHT ); // Update viewport to match texture size
    
    gl.bindFramebuffer( gl.FRAMEBUFFER, depthMapFBO ); // Render depth map to texture

    gl.clear( gl.DEPTH_BUFFER_BIT );
    drawAllObjectsDepth();

    gl.bindFramebuffer( gl.FRAMEBUFFER, null );
}

function render()
{
    gl.useProgram( shaderProgram );

    updateUniforms(); // Update lights and camera uniforms

    // Get back to backface culling for normal rendering
    //gl.cullFace(gl.BACK);
    gl.disable( gl.CULL_FACE );

    // Reload original viewport
    gl.viewport( 0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    drawAllObjects();

    gl.enable( gl.CULL_FACE );
}

function drawSkybox()
{
    gl.useProgram( skybox.program );
    // We're inside the cube, must remove front face culling
    gl.cullFace( gl.FRONT );
    // Enable environnement map
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_CUBE_MAP, skybox.envCubemap );

    // Update uniforms
    gl.uniformMatrix4fv( skybox.viewUniform, false, new Float32Array( flattenObject( mvMatrix.inverse() ) ) );
    gl.uniformMatrix4fv( skybox.projUniform, false, new Float32Array( flattenObject( skybox.proj ) ) );
    if ( rendering.hasChanged ) {
        gl.uniform1f( skybox.exposureUniform, rendering.exposure.value );
        gl.uniform1f( skybox.gammaUniform, rendering.gamma.value );
    }

    // Bind VAO
    gl.bindVertexArray( skybox.vao );
    gl.drawElements( gl.TRIANGLES, skybox.mesh.m_triangles.length * 3, gl.UNSIGNED_SHORT, 0 );
    gl.bindVertexArray( null );

    // Restore cull face
    gl.cullFace( gl.BACK );
}

function drawAllObjectsDepth()
{
    // Render all entities with specific VAO / VBO / UBO 
    var size = depthVaos.length - lights.length;
    for ( var i = 0; i < size; i++ ) {
        // Compute and update transforms UBOs according to mvMatrix
        updateMatrixUniformBufferDepth( i );
        // Bind VAO
        gl.bindVertexArray( depthVaos[ i ] );
        // Draw triangles
        gl.drawElements( scene.mode, entities[ i ].mesh.m_triangles.length * 3, gl.UNSIGNED_SHORT, 0 );
        // UNBIND VAO
        gl.bindVertexArray( null );
    }
}

/**
 * 씬내의 전체 객체들 렌더링
 */
function drawAllObjects()
{
    // Render all entities with specific VAO / VBO / UBO 
    for ( var i = 0 ; i < vaos.length ; i++ )
    {
        // Handle automatic rotation
        if ( entities[ i ].isRotating == true ) 
        {
            rotateEntity( i );
        } 
        else
        {
            entities[ i ].lastUpdateTime = Date.now();
        }

        updateMatrixUniformBuffer( i ); // Compute and update transforms UBOs according to mvMatrix

        var material = entities[ i ].mesh.material; // Set textures according to material or default if none found
        setTextures( material );

        gl.bindVertexArray( vaos[ i ] ); // Bind VAO

        gl.drawElements( scene.mode, entities[ i ].mesh.m_triangles.length * 3, gl.UNSIGNED_SHORT, 0 ); // Draw triangles

        gl.bindVertexArray( null ); // UNBIND VAO
    }
}


function rotateEntity( i ) 
{
    var currentTime = Date.now();

    if ( entities[ i ].lastUpdateTime ) 
    {
        var delta       = currentTime - entities[ i ].lastUpdateTime;
        var objRotation = ( 60 * delta ) / 1000.0;
    }
    else
    {
        entities[ i ].lastUpdateTime = currentTime;
    }

    if ( delta > 0 )
    {
        entities[ i ].rot[ 0 ] = ( entities[ i ].rot[ 0 ] + objRotation ) % 360;

        updateObjectMVMatrix( i );

        entities[ i ].lastUpdateTime = currentTime;
    }
}

/**
 * WorldView + WorldView + ProjectTM + DepthModelView
 * @param {number} idx 
 */
function updateMatrixUniformBuffer( idx )
{
    var depthMVP = depthVP.multiply( entities[ idx ].mvMatrix );
    transforms = new Float32Array( ( ( entities[ idx ].mvMatrix.flatten().concat( mvMatrix.flatten() ) ).concat( pMatrix.flatten() ) ).concat( depthMVP.flatten() ) );

    gl.bindBuffer( gl.UNIFORM_BUFFER, uniformPerDrawBuffer );
    gl.bufferSubData( gl.UNIFORM_BUFFER, 0, transforms );
    gl.bindBuffer( gl.UNIFORM_BUFFER, null );
}

function updateMatrixUniformBufferDepth( i )
{
    var depthMVP = depthVP.multiply( entities[i].mvMatrix );
    transforms = new Float32Array( depthMVP.flatten() );

    gl.bindBuffer( gl.UNIFORM_BUFFER, uniformPerDrawBuffer );
    gl.bufferSubData( gl.UNIFORM_BUFFER, 0, transforms );
    gl.bindBuffer( gl.UNIFORM_BUFFER, null );
}

/**
 * fragment shader를 위한 uniforms 갱신. 라이트 및 카메라 관련
 */
function updateUniforms()
{
    // Pushing the lights UBO with updated coordinates
    gl.bindBuffer( gl.UNIFORM_BUFFER, uniformPerPassBuffer );
    gl.bufferSubData( gl.UNIFORM_BUFFER, 0, new Float32Array( flattenObject( lights ) ) );
    gl.bindBuffer( gl.UNIFORM_BUFFER, null );

    // Send camera position too
    gl.uniform3fv( cameraUniform, flattenObject( camera.getPos() ) );

    if ( rendering.hasChanged )
    {
        gl.uniform1f( rendering.exposure.uniform, rendering.exposure.value );
        gl.uniform1f( rendering.gamma.uniform, rendering.gamma.value );
        gl.uniform1f( rendering.ambientIntensity.uniform, rendering.ambientIntensity.value );
    }
}

/**
 * gl.TEXTURE0 ~ gl.TEXTURE8 텍스쳐 객체 바인딩
 * @param {*} material 
 */
function setTextures( material )
{
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, depthMap );

    gl.activeTexture( gl.TEXTURE1 );
    gl.bindTexture( gl.TEXTURE_2D, material.albedo );

    gl.activeTexture( gl.TEXTURE2 );
    gl.bindTexture( gl.TEXTURE_2D, material.normal );

    gl.activeTexture( gl.TEXTURE3 );
    gl.bindTexture( gl.TEXTURE_2D, material.roughness );

    gl.activeTexture( gl.TEXTURE4 );
    gl.bindTexture( gl.TEXTURE_2D, material.ao );

    gl.activeTexture( gl.TEXTURE5 );
    gl.bindTexture( gl.TEXTURE_2D, material.fresnel );

    gl.activeTexture( gl.TEXTURE6 );
    gl.bindTexture( gl.TEXTURE_CUBE_MAP, skybox.irradianceMap );

    gl.activeTexture( gl.TEXTURE7 );
    gl.bindTexture( gl.TEXTURE_CUBE_MAP, skybox.prefilterMap );

    gl.activeTexture( gl.TEXTURE8 );
    gl.bindTexture( gl.TEXTURE_2D, skybox.brdfLUTTexture );
}

function updateSpinner()
{
    var loadPercent = document.getElementById("loadPercent");
    loadPercent.textContent = Math.floor( ( Texture.nbTextureLoaded / Texture.nbTextureToLoad ) * 100 ) + "%";
    if ( Texture.nbTextureLoaded == Texture.nbTextureToLoad )
    {
        var spinner = document.getElementById("loader");
        spinner.parentNode.removeChild(spinner);
    }
}