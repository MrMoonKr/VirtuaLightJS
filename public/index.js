/**
 * https://github.com/Atrix256/RandomCode/tree/master/WebGLPBR
 */

/**
 * 2021.09.15 코드 리팩토링
 */

/**@type {HTMLCanvasElement} */
var g_canvas                = null;
/**@type {WebGL2RenderingContext} */
var gl                      = null;

var g_debugPanelOpen        = true;

var g_projectionMatrix;
var g_cameraMatrix;

var g_cameraPosition        = [0, 0, 15];

var g_cameraYawPitchRoll    = [0, 0, 0];

var g_cameraMoveSpeed       = 5.0; // meters per second
var g_cameraRotateSpeed     = 0.01; // radians per second

var g_lastFrameTimeStamp    = 0;
var g_frameCount            = 0;
var g_frameCountTime        = 0;

var g_keyState              = new Array();

var g_pointerLocked         = false;

var g_ambientLight          = [0.01, 0.01, 0.01];

// a tone mapped and sRGB corrected version of the ambient light, that we can clear the screen with
var g_clearColor = [
    Math.pow(g_ambientLight[0] / (g_ambientLight[0] + 1.0), 1.0 / 2.2),
    Math.pow(g_ambientLight[1] / (g_ambientLight[1] + 1.0), 1.0 / 2.2),
    Math.pow(g_ambientLight[2] / (g_ambientLight[2] + 1.0), 1.0 / 2.2),
];

// a dictionary of file names to textures
/**
 * @type {Object.<string,WebGLTexture>}
 */
var g_images                = {};
var g_skyboxImages          = {};

// other images to load
var g_loadImages            = ["splitsum.png"];

// skyboxes
/**
 * Skybox PBR Textures Folder Lookups
 */
var g_skyboxes = {
    Vasa: "Skyboxes\\Vasa\\Vasa",
    Marriot: "Skyboxes\\Marriot\\Marriot",
    Dallas: "Skyboxes\\Dallas\\Dallas",
    mnight: "Skyboxes\\mnight\\mnight",
    ashcanyon: "Skyboxes\\ashcanyon\\ashcanyon",
};

// materials
/**
 * PBR Texture Lookups
 */
var g_materials = {
    "Rusted Iron": [
        "rustediron2_basecolor.png",
        "rustediron2_metallic.png",
        "rustediron2_roughness.png",
        "rustediron2_normal.png",
        "white.png",
    ],
    "Rough Rock": [
        "roughrockface2_Base_Color.png",
        "roughrockface2_Metallic.png",
        "roughrockface2_Roughness.png",
        "roughrockface2_Normal.png",
        "roughrockface2_Ambient_Occlusion.png",
    ],
    "Greasy Pan": [
        "greasy-pan-2-albedo.png",
        "greasy-pan-2-metal.png",
        "greasy-pan-2-roughness.png",
        "greasy-pan-2-normal.png",
        "white.png",
    ],
    "Scuffed Iron": [
        "Iron-Scuffed_basecolor.png",
        "Iron-Scuffed_metallic.png",
        "Iron-Scuffed_roughness.png",
        "Iron-Scuffed_normal.png",
        "white.png",
    ],
    "Floorboards": [
        "sculptedfloorboards2b_basecolor.png",
        "sculptedfloorboards2b_metalness.png",
        "sculptedfloorboards2b_roughness.png",
        "sculptedfloorboards2b_normal.png",
        "sculptedfloorboards2b_AO.png",
    ],
};

/**@type {MYShader[]} */
var g_shaders           = [];
/**@type {MYShader} */
var g_skyboxShader      = null;
/**@type {WebGLProgram} */
var g_lastShaderUsed    = null;

// light positions
var g_light0Pos         = [-5, -5, 5];
var g_light1Pos         = [-5, 5, 5];
var g_light2Pos         = [5, -5, 5];
var g_light3Pos         = [5, 5, 5];

var g_lightDir          = [0.5, 0.2, 0.3];

//lights
var g_light0ColorA      = [300.0, 300.0, 300.0];
var g_light1ColorA      = [300.0, 300.0, 300.0];
var g_light2ColorA      = [300.0, 300.0, 300.0];
var g_light3ColorA      = [300.0, 300.0, 300.0];

var g_lightDirColor     = [1.0, 1.0, 1.0];

// colorful lights
var g_light0ColorB      = [300.0, 0.0, 0.0];
var g_light1ColorB      = [0.0, 300.0, 0.0];
var g_light2ColorB      = [0.0, 0.0, 300.0];
var g_light3ColorB      = [300.0, 300.0, 0.0];

// You can use these uniforms in your vertex or pixel shaders without defining them, 
// they are automatically defined and piped through if actually used.
var g_uniforms = 
{
    u_projectionMatrix: [
        "mat4",
        ( key, location, objectValues ) => {
            gl.uniformMatrix4fv( location, false, g_projectionMatrix );
        },
    ],
    u_cameraMatrix: [
        "mat4",
        ( key, location, objectValues ) => {
            gl.uniformMatrix4fv( location, false, g_cameraMatrix );
        },
    ],
    u_screenResolution: [
        "vec2",
        ( key, location, objectValues ) => {
            gl.uniform2fv( location, [ gl.canvas.width, gl.canvas.height ] );
        },
    ],

    u_cameraPosition: [
        "vec3",
        ( key, location, objectValues ) => {
            gl.uniform3fv( location, g_cameraPosition );
        },
    ],

    u_ambientLight: [
        "vec3",
        ( key, location, objectValues ) => {
            gl.uniform3fv( location, g_ambientLight );
        },
    ],

    u_light0Pos: [
        "vec3",
        ( key, location, objectValues ) => {
            var pos = GetLightPos( 0 );
            gl.uniform3fv( location, pos );
        },
    ],
    u_light0Color: [
        "vec3",
        ( key, location, objectValues ) => {
            var color = GetLightColor( 0 );
            gl.uniform3fv( location, color );
        },
    ],

    u_light1Pos: [
        "vec3",
        ( key, location, objectValues ) => {
            var pos = GetLightPos( 1 );
            gl.uniform3fv( location, pos );
        },
    ],
    u_light1Color: [
        "vec3",
        ( key, location, objectValues ) => {
            var color = GetLightColor( 1 );
            gl.uniform3fv( location, color );
        },
    ],

    u_light2Pos: [
        "vec3",
        ( key, location, objectValues ) => {
            var pos = GetLightPos( 2 );
            gl.uniform3fv( location, pos );
        },
    ],
    u_light2Color: [
        "vec3",
        ( key, location, objectValues ) => {
            var color = GetLightColor( 2 );
            gl.uniform3fv( location, color );
        },
    ],

    u_light3Pos: [
        "vec3",
        ( key, location, objectValues ) => {
            var pos = GetLightPos( 3 );
            gl.uniform3fv( location, pos );
        },
    ],
    u_light3Color: [
        "vec3",
        ( key, location, objectValues ) => {
            var color = GetLightColor( 3 );
            gl.uniform3fv( location, color );
        },
    ],

    u_lightDir: [
        "vec3",
        ( key, location, objectValues ) => {
            gl.uniform3fv( location, g_lightDir );
        },
    ],
    u_lightDirColor: [
        "vec3",
        ( key, location, objectValues ) => {
            var color = GetDirectionalLightColor();
            gl.uniform3fv( location, color );
        },
    ],
    u_lightDirType: [
        "float",
        ( key, location, objectValues ) => {
            gl.uniform1f( location, GetObjectValue( objectValues, key ) );
        },
    ],

    u_normalMapping: [
        "float",
        ( key, location, objectValues ) => {
            gl.uniform1f( location, GetObjectValue( objectValues, key ) );
        },
    ],
    u_AO: [
        "float",
        ( key, location, objectValues ) => {
            gl.uniform1f( location, GetObjectValue( objectValues, key ) );
        },
    ],

    u_objectMatrix: [
        "mat4",
        ( key, location, objectValues ) => {
            gl.uniformMatrix4fv( location, false, GetObjectValue( objectValues, key ) );
        },
    ],
    u_invTransObjectMatrix: [
        "mat4",
        ( key, location, objectValues ) => {
            gl.uniformMatrix4fv( location, false, GetObjectValue( objectValues, key ) );
        },
    ],
    u_objectAlbedo: [
        "vec3",
        ( key, location, objectValues ) => {
            gl.uniform3fv( location, GetObjectValue( objectValues, key ) );
        },
    ],
    u_objectEmissive: [
        "vec3",
        ( key, location, objectValues ) => {
            gl.uniform3fv( location, GetObjectValue( objectValues, key ) );
        },
    ],
    u_objectMetallic: [
        "float",
        ( key, location, objectValues ) => {
            gl.uniform1f( location, GetObjectValue( objectValues, key ) );
        },
    ],
    u_objectRoughness: [
        "float",
        ( key, location, objectValues ) => {
            gl.uniform1f( location, GetObjectValue( objectValues, key ) );
        },
    ],
    u_objectAO: [
        "float",
        ( key, location, objectValues ) => {
            gl.uniform1f( location, GetObjectValue( objectValues, key ) );
        },
    ],
    u_objectF0: [
        "float",
        ( key, location, objectValues ) => {
            gl.uniform1f( location, GetObjectValue( objectValues, key ) );
        },
    ],

    u_textureAlbedo: [
        "sampler2D",
        ( key, location, objectValues ) => {
            gl.activeTexture( gl.TEXTURE0 );
            gl.bindTexture( gl.TEXTURE_2D, GetObjectValue( objectValues, key ) );
            gl.uniform1i( location, 0 );
        },
    ],
    u_textureMetallic: [
        "sampler2D",
        ( key, location, objectValues ) => {
            gl.activeTexture( gl.TEXTURE1 );
            gl.bindTexture( gl.TEXTURE_2D, GetObjectValue( objectValues, key ) );
            gl.uniform1i( location, 1 );
        },
    ],
    u_textureRoughness: [
        "sampler2D",
        ( key, location, objectValues ) => {
            gl.activeTexture( gl.TEXTURE2 );
            gl.bindTexture( gl.TEXTURE_2D, GetObjectValue( objectValues, key ) );
            gl.uniform1i( location, 2 );
        },
    ],
    u_textureNormal: [
        "sampler2D",
        ( key, location, objectValues ) => {
            gl.activeTexture( gl.TEXTURE3 );
            gl.bindTexture( gl.TEXTURE_2D, GetObjectValue( objectValues, key ) );
            gl.uniform1i( location, 3 );
        },
    ],
    u_textureAO: [
        "sampler2D",
        ( key, location, objectValues ) => {
            gl.activeTexture( gl.TEXTURE4 );
            gl.bindTexture( gl.TEXTURE_2D, GetObjectValue( objectValues, key ) );
            gl.uniform1i( location, 4 );
        },
    ],

    u_splitSum: [
        "sampler2D",
        ( key, location, objectValues ) => {
            gl.activeTexture( gl.TEXTURE5 );
            gl.bindTexture( gl.TEXTURE_2D, GetObjectValue( objectValues, key ) );
            gl.uniform1i( location, 5 );
        },
    ],

    u_diffuseIBL: [
        "samplerCube",
        ( key, location, objectValues ) => {
            gl.activeTexture( gl.TEXTURE6 );
            gl.bindTexture( gl.TEXTURE_CUBE_MAP, GetObjectValue( objectValues, key ) );
            gl.uniform1i( location, 6 );
        },
    ],
    u_specularIBL: [
        "samplerCube",
        ( key, location, objectValues ) => {
            gl.activeTexture( gl.TEXTURE7 );
            gl.bindTexture( gl.TEXTURE_CUBE_MAP, GetObjectValue( objectValues, key ) );
            gl.uniform1i( location, 7 );
        },
    ],
};

let EOutputMode = {
    shaded:     0,
    albedo:     1,
    normal:     2,
    metallic:   3,
    roughness:  4,
    emissive:   5,
    ao:         6,
    COUNT:      7,
};

var g_uniformsShaderSource = "";

//=========================================================================================
var precisionSource = "precision mediump float;\n\n";

//=========================================================================================
var skyboxVertexShaderSource = 
`
in vec4     a_position;
out vec3    u_uvw;

void main()
{
    u_uvw       = a_position.xyz ;
    gl_Position = ( u_projectionMatrix * mat4( mat3( u_cameraMatrix ) ) * a_position ).xyww ;
}  
`;

//=========================================================================================
var skyboxFragmentShaderSource = `

    #pragma vscode_glsllint_stage: STAGE

    in vec3     u_uvw ;
    out vec4    outColor ;

    void main()
    {    
        outColor = texture( u_diffuseIBL, u_uvw );
    }
    `;

//=========================================================================================
var vertexShaderSource = 
`
    #pragma vscode_glsllint_stage: STAGE

    // vertex input
    in vec4     a_position;
    in vec3     a_normal;
    in vec3     a_tangent;
    in vec2     a_uv;
    in vec3     a_barycentric;

    // vertex output
    out vec3    v_worldPos;
    out vec3    v_normal;
    out vec3    v_tangent;
    out vec2    v_uv;
    out vec3    v_barycentric;
    out mat3    v_tbn;

    void main()
    {
        // 메시정점의 월드변환
        v_worldPos      = ( u_objectMatrix * a_position ).xyz ;

        // This offloads inverse transpose matrix calculation to the GPU, but is done per vertex instead of per object.
        //v_normal        = mat3( transpose( inverse( u_objectMatrix ) ) ) * a_normal ;

        // write out the world space normal and tangent vectors
        // 법선벡터와 탄젠트벡터를 모델좌표계로
        v_normal        = mat3( u_invTransObjectMatrix ) * a_normal ;
        v_tangent       = mat3( u_invTransObjectMatrix ) * a_tangent ;

        // make TBN matrix via Gram-Schmidt process
        // 법선벡터와 탄젠트벡터로 부터 TBN 행렬구하기
        vec3 T          = normalize( vec3( u_objectMatrix * vec4( a_tangent, 0.0 ) ) ) ;
        vec3 N          = normalize( vec3( u_objectMatrix * vec4( a_normal,  0.0 ) ) ) ;
        T               = normalize( T - dot( T, N ) * N ) ;
        vec3 B          = cross( N, T ) ;
        v_tbn           = mat3( T, B, N ) ;

        v_uv            = a_uv ;
        v_barycentric   = a_barycentric ;

        gl_Position     = u_projectionMatrix * u_cameraMatrix * u_objectMatrix * a_position ;
    }
`;

//=========================================================================================
var fragmentShaderSource = 
`
    #pragma vscode_glsllint_stage: STAGE

    // pixel input
    in vec3     v_worldPos;
    in vec3     v_normal;
    in vec3     v_tangent;
    in vec2     v_uv;
    in vec3     v_barycentric;
    in mat3     v_tbn;

    // pixel output
    out vec4    outColor;

    // TODO: clean up all this code

    const float PI = 3.14159265359;

    float DistributionGGX( vec3 N, vec3 H, float roughness )
    {
        float a      = roughness * roughness ;
        float a2     = a * a ;
        float NdotH  = max( dot( N, H ), 0.0 ) ;
        float NdotH2 = NdotH * NdotH ;
    
        float nom    = a2 ;
        float denom  = ( NdotH2 * ( a2 - 1.0 ) + 1.0 );
        denom        = PI * denom * denom ;
    
        return nom / denom ;
    }

    float GeometrySchlickGGX( float NdotV, float roughness )
    {
        float r     = ( roughness + 1.0 ) ;
        float k     = ( r * r ) / 8.0 ;

        float nom   = NdotV ;
        float denom = NdotV * ( 1.0 - k ) + k ;
    
        return nom / denom ;
    }

    float GeometrySmith( vec3 N, vec3 V, vec3 L, float roughness )
    {
        float NdotV = max( dot( N, V ), 0.0 ) ;
        float NdotL = max( dot( N, L ), 0.0 ) ;
        float ggx2  = GeometrySchlickGGX( NdotV, roughness ) ;
        float ggx1  = GeometrySchlickGGX( NdotL, roughness ) ;
    
        return ggx1 * ggx2 ;
    }

    vec3 fresnelSchlickRoughness( float cosTheta, vec3 F0, float roughness )
    {
        return F0 + ( max( vec3( 1.0 - roughness ), F0 ) - F0 ) * pow( 1.0 - cosTheta, 5.0 ) ;
    }  

    vec3 fresnelSchlick( float cosTheta, vec3 F0 )
    {
        return F0 + ( 1.0 - F0 ) * pow( 1.0 - cosTheta, 5.0 );
    }  

    vec3 PositionalLight( vec3 worldPos, vec3 N, vec3 V, 
                          vec3 lightPos, vec3 lightColor, 
                          vec3 albedo, float metallic, float roughness, float scalarF0 )
    {
        float distance      = length( lightPos - worldPos ) ;
        float attenuation   = 1.0 / ( distance * distance ) ;

        vec3 L              = normalize( lightPos - worldPos );  
        vec3 H              = normalize( V + L );  

        vec3 radiance       = lightColor * attenuation ;

        vec3 F0             = vec3( scalarF0 ) ; 
        F0                  = mix( F0, albedo, metallic ) ;

        vec3 F              = fresnelSchlick( max( dot( H, V ), 0.0 ), F0 ) ;
        float NDF           = DistributionGGX( N, H, roughness ) ;
        float G             = GeometrySmith( N, V, L, roughness ) ;

        vec3 nominator      = NDF * G * F ;
        float denominator   = 4.0 * max( dot( N, V ), 0.0 ) * max( dot( N, L ), 0.0 ) + 0.001 ;
        vec3 specular       = nominator / denominator ;

        vec3 kS = F ;
        vec3 kD = vec3( 1.0 ) - kS ;

        kD *= 1.0 - metallic ;

        float NdotL = max( dot( N, L ), 0.0 ) ;
        return ( kD * albedo / PI + specular ) * radiance * NdotL ;
    }

    vec3 DirectionalLight( vec3 worldPos, vec3 N, vec3 V,
                           vec3 lightDir, vec3 lightColor,
                           vec3 albedo, float metallic, float roughness, float scalarF0 )
    {
        vec3 L              = normalize( lightDir ) ;
        vec3 H              = normalize( V + L ) ;

        vec3 radiance       = lightColor ;

        vec3 F0             = vec3( scalarF0 ) ;
        F0                  = mix( F0, albedo, metallic );

        vec3 F              = fresnelSchlick( max( dot( H, V ), 0.0 ), F0 ) ;
        float NDF           = DistributionGGX( N, H, roughness ) ;
        float G             = GeometrySmith( N, V, L, roughness ) ;

        vec3 nominator      = NDF * G * F ;
        float denominator   = 4.0 * max( dot( N, V ), 0.0 ) * max( dot( N, L ), 0.0 ) + 0.001 ;
        vec3 specular       = nominator / denominator ;

        vec3 kS = F ;
        vec3 kD = vec3( 1.0 ) - kS ;

        kD *= 1.0 - metallic ;

        float NdotL = max( dot( N, L ), 0.0 ) ;
        return ( kD * albedo / PI + specular ) * radiance * NdotL ;
    }

    float D_GGX( float NoH, float linearRoughness )
    {
        float a = NoH * linearRoughness;
        float k = linearRoughness / ( 1.0 - NoH * NoH + a * a );
        return k * k * ( 1.0 / PI );
    }

    float V_SmithGGXCorrelated( float NoV, float NoL, float linearRoughness )
    {
        float a2    = linearRoughness * linearRoughness ;
        float GGXV  = NoL * sqrt( NoV * NoV * ( 1.0 - a2 ) + a2 ) ;
        float GGXL  = NoV * sqrt( NoL * NoL * ( 1.0 - a2 ) + a2 ) ;
        return 0.5 / ( GGXV + GGXL ) ;
    }

    vec3 F_Schlick( float VoH, vec3 f0 )
    {
        float f = pow( 1.0 - VoH, 5.0 ) ;
        return f + f0 * ( 1.0 - f ) ;
    }

    vec3 DirectionalLight2( vec3 worldPos, vec3 N, vec3 V,
                            vec3 lightDir, vec3 lightColor,
                            vec3 albedo, float metallic, float roughness, float scalarF0 )
    {
        vec3 L      = normalize( lightDir ) ;
        vec3 H      = normalize( V + L ) ;

        vec3 F0     = vec3( scalarF0 ) ; 
        F0          = mix( F0, albedo, metallic );

        float NoH   = clamp( dot( N, H ), 0.0, 1.0 ) ;
        float NoV   = clamp( dot( N, V ), 0.0, 1.0 ) ;
        float HoV   = clamp( dot( H, V ), 0.0, 1.0 ) ;
        float NoL   = clamp( dot( N, L ), 0.0, 1.0 ) ;

        float D     = D_GGX( NoH, roughness * roughness );
        vec3 F      = F_Schlick( HoV, F0 );
        float Vis   = V_SmithGGXCorrelated( NoV, NoL, roughness * roughness );

        vec3 specular = F * ( D * Vis );

        vec3 kS = F ;
        vec3 kD = vec3( 1.0 ) - kS ;
            
        kD *= 1.0 - metallic ;

        return ( kD * albedo / PI + specular ) * lightColor * NoL ;
    }

    vec3 IBL( vec3 N, vec3 V, vec3 R, vec3 albedo, float metallic, float roughness, float scalarF0 )
    {
        vec3 F0     = vec3( scalarF0 ) ;
        F0          = mix( F0, albedo, metallic ) ;

        vec3 F      = fresnelSchlickRoughness( max( dot( N, V ), 0.0 ), F0, roughness ) ;

        vec3 kS = F ;
        vec3 kD = vec3( 1.0 ) - kS ;

        kD *= 1.0 - metallic;

        // diffuse IBL
        vec3 irradiance = pow( texture( u_diffuseIBL, N ).rgb, vec3( 2.2 ) );
        vec3 diffuse    = irradiance * albedo ;

        // specular IBL
        const float MAX_REFLECTION_LOD = 4.0 ;

        // TODO: temp!
        //roughness = 1.0f;

        vec3 prefilteredColor   = pow( textureLod( u_specularIBL, R, roughness * MAX_REFLECTION_LOD ).rgb, vec3( 2.2 ) ) ;
        vec2 brdf               = texture( u_splitSum, vec2( max( dot( N, V ), 0.0 ), roughness ) ).rg ;
        vec3 specular           = prefilteredColor * ( F * brdf.x + brdf.y );

        vec3 ambient = ( kD * diffuse + specular );
        return ambient;
    }

    void main()
    {
        #if DEBUG_WIREFRAME
            float margin        = length( fwidth( v_barycentric ) ) * 0.25 ;

            float barycentricMin = min( v_barycentric.x, min( v_barycentric.y, v_barycentric.z ) );
            if ( barycentricMin > margin ) // 0.025 )
                discard;
        #endif

        vec3 V                  = normalize( u_cameraPosition - v_worldPos ) ;

        vec3 col                = u_objectEmissive ;        // 발광색

        vec3 objectAlbedo       = u_objectAlbedo ;          // Albedo 자체색
        float objectMetallic    = u_objectMetallic ;        // Metallic 메탈지수
        float objectRoughness   = u_objectRoughness ;       // Roughness 러프지수
        float objectAO          = u_objectAO ;              // Ambient Occlusion 차폐음영

        #if USE_MATERIAL_TEXTURES
            vec3 texAlbedo      = pow( texture( u_textureAlbedo, v_uv ).rgb, vec3( 2.2 ) ) ;
            float texMetallic   = texture( u_textureMetallic, v_uv ).r ;
            float texRoughness  = texture( u_textureRoughness, v_uv ).r ;
            float texAO         = texture( u_textureAO, v_uv ).r ;
            vec3 texN           = texture( u_textureNormal, v_uv ).rgb * 2.0 - 1.0 ;
        #else
            vec3 texAlbedo      = vec3( 1.0 ) ;
            float texMetallic   = 0.5 ;
            float texRoughness  = 0.5 ;
            float texAO         = 1.0 ;
            vec3 texN           = vec3( 0.0, 0.0, 1.0 ) ;
        #endif

        objectAlbedo            *= texAlbedo ;
        objectAO                *= texAO ;

        // handle features being turned off
        objectAO                = mix( 1.0, objectAO, u_AO ) ;
        texN                    = mix( vec3( 0.0, 0.0, 1.0 ), texN, u_normalMapping );
        vec3 N                  = normalize( v_tbn * texN );
        vec3 R                  = reflect( -V, N ); 

        // TODO: do these branchlessly
        if ( objectMetallic <= 1.0 )
            objectMetallic = mix( 0.0, texMetallic, objectMetallic );
        else
            objectMetallic = mix( texMetallic, 1.0, objectMetallic - 1.0 );

        if ( objectRoughness <= 1.0 )
            objectRoughness = mix( 0.0, texRoughness, objectRoughness );
        else
            objectRoughness = mix( texRoughness, 1.0, objectRoughness - 1.0 );

        objectRoughness = clamp( objectRoughness, 0.01, 0.9 );

        // positional lights
        col += PositionalLight( v_worldPos, N, V, u_light0Pos, u_light0Color, objectAlbedo, objectMetallic, objectRoughness, u_objectF0 ) * objectAO ;
        col += PositionalLight( v_worldPos, N, V, u_light1Pos, u_light1Color, objectAlbedo, objectMetallic, objectRoughness, u_objectF0 ) * objectAO ;
        col += PositionalLight( v_worldPos, N, V, u_light2Pos, u_light2Color, objectAlbedo, objectMetallic, objectRoughness, u_objectF0 ) * objectAO ;
        col += PositionalLight( v_worldPos, N, V, u_light3Pos, u_light3Color, objectAlbedo, objectMetallic, objectRoughness, u_objectF0 ) * objectAO ;

        // directional light
        if ( u_lightDirType == 1.0f )
            col += DirectionalLight2( v_worldPos, N, V, u_lightDir, u_lightDirColor, objectAlbedo, objectMetallic, objectRoughness, u_objectF0 ) * objectAO ;
        else
            col += DirectionalLight( v_worldPos, N, V, u_lightDir, u_lightDirColor, objectAlbedo, objectMetallic, objectRoughness, u_objectF0 ) * objectAO ;

        // IBL diffuse and specular
        #if USE_IBL
            col += IBL( N, V, R, objectAlbedo, objectMetallic, objectRoughness, u_objectF0 )  * objectAO ;
        // else, ambient light 
        #else
            col += u_ambientLight * objectAlbedo * objectAO ;
        #endif

        // HDR -> LDR
        col = col / ( col + vec3( 1.0 ) ) ;

        // Debug mode outputs
        #if OUTPUT_MODE == OUTPUT_MODE_SHADED
            outColor.rgb = pow( col, vec3( 1.0 / 2.2 ) ) ;
        #endif

        #if OUTPUT_MODE == OUTPUT_MODE_ALBEDO
            outColor.rgb = objectAlbedo ;
        #endif

        #if OUTPUT_MODE == OUTPUT_MODE_NORMAL
            outColor.rgb = N * 0.5 + 0.5 ;
        #endif  

        #if OUTPUT_MODE == OUTPUT_MODE_METALLIC
            outColor.rgb = vec3( objectMetallic ) ;
        #endif    

        #if OUTPUT_MODE == OUTPUT_MODE_ROUGHNESS
            outColor.rgb = vec3( objectRoughness ) ;
        #endif     

        #if OUTPUT_MODE == OUTPUT_MODE_EMISSIVE
            outColor.rgb = u_objectEmissive ;
        #endif 

        #if OUTPUT_MODE == OUTPUT_MODE_AO
            outColor.rgb = vec3( objectAO ) ;
        #endif

        outColor.a = 1.0 ;
    }
`;

//=========================================================================================
function GetDirectionalLightColor()
{
    if ( document.getElementById("Debug_DirectionalLight").checked )
    {
        return g_lightDirColor;
    }
    else
    {
        return [0, 0, 0];
    }
}

//=========================================================================================
function GetLightColor( lightIndex )
{
    if ( document.getElementById("Debug_UseColoredLights").checked ) 
    {
        switch ( lightIndex )
        {
            case 0:
                return g_light0ColorB ;
            case 1:
                return g_light1ColorB ;
            case 2:
                return g_light2ColorB ;
            case 3:
                return g_light3ColorB ;
        }
    } 
    else 
    {
        switch ( lightIndex ) 
        {
            case 0:
                return g_light0ColorA ;
            case 1:
                return g_light1ColorA ;
            case 2:
                return g_light2ColorA ;
            case 3:
                return g_light3ColorA ;
        }
    }
}

//=========================================================================================
function GetLightPos( lightIndex )
{
    if ( !document.getElementById( "Debug_PointLight" + lightIndex ).checked )
    {
        return [-10000, -10000, -10000];
    }

    if ( document.getElementById( "Debug_AnimateLights" ).checked ) 
    {
        var seconds = new Date().getTime() / 1000 ;

        var offset  = [];
        offset[0]   = Math.sin( seconds * ( lightIndex + 1 ) ) * 2 ;
        offset[1]   = Math.cos( seconds * ( lightIndex + 1 ) ) * 2 ;
        offset[2]   =
            Math.sin( seconds * ( lightIndex + 1 ) ) *
            Math.cos( seconds * ( lightIndex + 1 ) ) *
            3;

        switch ( lightIndex )
        {
            case 0:
                return [ g_light0Pos[0] + offset[0], g_light0Pos[1] + offset[1], g_light0Pos[2] + offset[2], ] ;
            case 1:
                return [ g_light1Pos[0] + offset[0], g_light1Pos[1] + offset[1], g_light1Pos[2] + offset[2], ] ;
            case 2:
                return [ g_light2Pos[0] + offset[0], g_light2Pos[1] + offset[1], g_light2Pos[2] + offset[2], ] ;
            case 3:
                return [ g_light3Pos[0] + offset[0], g_light3Pos[1] + offset[1], g_light3Pos[2] + offset[2], ] ;
        }
    } 
    else 
    {
        switch ( lightIndex ) 
        {
            case 0:
                return g_light0Pos ;
            case 1:
                return g_light1Pos ;
            case 2:
                return g_light2Pos ;
            case 3:
                return g_light3Pos ;
        }
    }
}

//=========================================================================================
function GetNumShaderPermutations() 
{
    return GetShaderPermutationIndex( true, true, true, EOutputMode.COUNT );
}

//=========================================================================================
function GetShaderPermutationIndex(
    wireFrame,
    useMaterialTextures,
    useIBL,
    outputMode
) {
    var ret = 0;
    if (wireFrame) ret += 1;
    if (useMaterialTextures) ret += 2;
    if (useIBL) ret += 4;
    ret += outputMode * 8;
    return ret;
}

//=========================================================================================
function GetShaderPermutationSourceString( index )
{
    return (
        "#define DEBUG_WIREFRAME " + ( index % 2 ) + "\n" +
        "#define USE_MATERIAL_TEXTURES " + ( Math.floor( index / 2 ) % 2 ) + "\n" +
        "#define USE_IBL " + ( Math.floor( index / 4 ) % 2 ) + "\n" +
        "#define OUTPUT_MODE " + Math.floor( index / 8 ) + "\n" +
        "#define OUTPUT_MODE_SHADED    0\n" +
        "#define OUTPUT_MODE_ALBEDO    1\n" +
        "#define OUTPUT_MODE_NORMAL    2\n" +
        "#define OUTPUT_MODE_METALLIC  3\n" +
        "#define OUTPUT_MODE_ROUGHNESS 4\n" +
        "#define OUTPUT_MODE_EMISSIVE  5\n" +
        "#define OUTPUT_MODE_AO        6\n" +
        "\n"
    );
}

/**
 * 셰이더 객체 생성
 * @param {WebGL2RenderingContext} gl 
 * @param {Number} type gl.VERTEX_SHADER | gl.FRAGMENT_SHADER
 * @param {String} source 
 * @param {String} permutationSource 
 * @returns {WebGLShader} 셰이더 객체
 */
function CreateShader( gl, type, source, permutationSource ) 
{
    var fullSource =
        "#version 300 es\n\n" +
        precisionSource +
        permutationSource +
        g_uniformsShaderSource +
        source;

    var shader = gl.createShader( type );
    gl.shaderSource( shader, fullSource );
    gl.compileShader( shader );
    var success = gl.getShaderParameter( shader, gl.COMPILE_STATUS );
    if ( success ) 
    {
        return shader;
    }

    var shaderErrorInfo = gl.getShaderInfoLog( shader );
    alert( shaderErrorInfo + "\n" + fullSource );

    console.log( shaderErrorInfo );
    console.log( fullSource );
    gl.deleteShader( shader );
}

/**
 * 셰이더 프로그램 생성
 * @param {WebGL2RenderingContext} gl 
 * @param {WebGLShader} vertexShader 
 * @param {WebGLShader} fragmentShader 
 * @returns 
 */
function CreateProgram( gl, vertexShader, fragmentShader ) 
{
    var program = gl.createProgram();
    gl.attachShader( program, vertexShader );
    gl.attachShader( program, fragmentShader );
    gl.linkProgram( program );

    var success = gl.getProgramParameter( program, gl.LINK_STATUS );
    if ( success ) 
    {
        return program;
    }

    console.log( "셰이더프로그램 생성 실패 : " + gl.getProgramInfoLog( program ) );
    gl.deleteProgram( program );
}

/**
 * 
 */

/**
 * 내부 셰이더 객체
 * @typedef {Object} MYShader
 * @property {WebGLProgram} program
 * @property {Object.<string,WebGLUniformLocation>} uniforms
 */

/**
 * 셰이더 객체 생성. 내부에 Uniform Location 저장
 * @param {string} vertexSource 
 * @param {string} fragmentSource 
 * @param {string} permutationSource 
 * @returns {MYShader}
 */
function MakeShader( vertexSource, fragmentSource, permutationSource )
{
    // compile shader
    var vertexShader    = CreateShader( gl, gl.VERTEX_SHADER, vertexSource, permutationSource );
    var fragmentShader  = CreateShader( gl, gl.FRAGMENT_SHADER, fragmentSource, permutationSource );
    var program         = CreateProgram( gl, vertexShader, fragmentShader );

    // get the uniform locations, for any uniforms it may use
    /**
     * @type {MYShader}
     */
    var shader = {};
    shader.program = program;
    shader.uniforms = {};
    for ( var key in g_uniforms )
    {
        shader.uniforms[ key ] = gl.getUniformLocation( shader.program, key );
    }

    // return the shader to the caller
    return shader;
}

/**
 * 카메라행렬 갱신.
 * 뷰행렬입니다. 카메라 월드 행렬의 역행렬
 */
function UpdateCameraMatrix() 
{
    g_cameraMatrix = CameraMatrix( 
        g_cameraYawPitchRoll, 
        VectorMultiply( g_cameraPosition, -1 ) 
    );
}

/**
 * 투영행렬 갱신. 
 * fov : 45도로 고정.
 * near : 0.1
 * far : 3000
 */
function UpdateProjectionMatrix() 
{
    g_projectionMatrix = Perspective(
        ( 45.0 * Math.PI ) / 180.0,
        gl.canvas.width / gl.canvas.height,
        0.1,
        3000.0 
    );
}

/**
 * 캔버스의 크기 조정 및 투영행렬 갱신.
 * @param {HTMLCanvasElement} canvas 
 */
function Resize( canvas ) 
{
    // Lookup the size the browser is displaying the canvas.
    var displayWidth  = canvas.clientWidth;
    var displayHeight = canvas.clientHeight;

    // Check if the canvas is not the same size.
    if ( canvas.width !== displayWidth || canvas.height !== displayHeight ) 
    {
        // Make the canvas the same size
        canvas.width  = displayWidth;
        canvas.height = displayHeight;

        UpdateProjectionMatrix();
    }
}

//=========================================================================================
function Perspective( fieldOfViewInRadians, aspect, near, far ) 
{
    var f = Math.tan( Math.PI * 0.5 - 0.5 * fieldOfViewInRadians );
    var rangeInv = 1.0 / ( near - far );

    return [
        f / aspect,
        0,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        0,
        (near + far) * rangeInv,
        -1,
        0,
        0,
        near * far * rangeInv * 2,
        0,
    ];
}


/**
 * 4x4 행렬곱
 * @param {*} A 
 * @param {*} B 
 * @returns 
 */
function MultiplyMatrix4x4( A, B ) 
{
    var ret = [];

    for ( var i = 0 ; i < 4 ; ++i ) 
    {
        for ( var j = 0 ; j < 4 ; ++j ) 
        {
            ret[ i * 4 + j ] =
                A[ i * 4 + 0 ] * B[ 0 * 4 + j ] +
                A[ i * 4 + 1 ] * B[ 1 * 4 + j ] +
                A[ i * 4 + 2 ] * B[ 2 * 4 + j ] +
                A[ i * 4 + 3 ] * B[ 3 * 4 + j ] ;
        }
    }

    return ret;
}

/**
 * 카메라행렬 만들기 ( 카메라 월드 행렬의 역행렬 )
 * @param {*} yawPitchRoll 
 * @param {*} translation 
 * @returns 
 */
function CameraMatrix( yawPitchRoll, translation )
{
    var cosAlpha    = Math.cos( yawPitchRoll[2] );
    var sinAlpha    = Math.sin( yawPitchRoll[2] );

    var cosBeta     = Math.cos( yawPitchRoll[0] );
    var sinBeta     = Math.sin( yawPitchRoll[0] );

    var cosGamma    = Math.cos( yawPitchRoll[1] );
    var sinGamma    = Math.sin( yawPitchRoll[1] );

    var rot = [
        cosAlpha * cosBeta,
        cosAlpha * sinBeta * sinGamma - sinAlpha * cosGamma,
        cosAlpha * sinBeta * cosGamma + sinAlpha * sinGamma,
        0,

        sinAlpha * cosBeta,
        sinAlpha * sinBeta * sinGamma + cosAlpha * cosGamma,
        sinAlpha * sinBeta * cosGamma - cosAlpha * sinGamma,
        0,

        -sinBeta,
        cosBeta * sinGamma,
        cosBeta * cosGamma,
        0,

        0,
        0,
        0,
        1,
    ];

    var trans = [
        1,
        0,
        0,
        0,

        0,
        1,
        0,
        0,

        0,
        0,
        1,
        0,

        translation[0],
        translation[1],
        translation[2],
        1,
    ];

    return MultiplyMatrix4x4( trans, rot );
}

/**
 * 월드변환행렬 얻기
 * @param {number[3]} yawPitchRoll 회전 
 * @param {*} translation 위치
 * @param {*} scale 크기
 * @returns 
 */
function TransformationMatrix( yawPitchRoll, translation, scale ) 
{
    var cosAlpha    = Math.cos(yawPitchRoll[2]);
    var sinAlpha    = Math.sin(yawPitchRoll[2]);

    var cosBeta     = Math.cos(yawPitchRoll[0]);
    var sinBeta     = Math.sin(yawPitchRoll[0]);

    var cosGamma    = Math.cos(yawPitchRoll[1]);
    var sinGamma    = Math.sin(yawPitchRoll[1]);

    var rot = [
        cosAlpha * cosBeta,
        cosAlpha * sinBeta * sinGamma - sinAlpha * cosGamma,
        cosAlpha * sinBeta * cosGamma + sinAlpha * sinGamma,
        0,
        sinAlpha * cosBeta,
        sinAlpha * sinBeta * sinGamma + cosAlpha * cosGamma,
        sinAlpha * sinBeta * cosGamma - cosAlpha * sinGamma,
        0,
        -sinBeta,
        cosBeta * sinGamma,
        cosBeta * cosGamma,
        0,
        0,
        0,
        0,
        1,
    ];

    var scale = [
        scale[0],
        0,
        0,
        0,
        0,
        scale[1],
        0,
        0,
        0,
        0,
        scale[2],
        0,
        0,
        0,
        0,
        1,
    ];

    var trans = [
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        translation[0],
        translation[1],
        translation[2],
        1,
    ];

    return MultiplyMatrix4x4(MultiplyMatrix4x4(scale, rot), trans);
}

//=========================================================================================
function MatrixTranspose4x4( matrix ) 
{
    return [
        matrix[0 * 4 + 0],
        matrix[1 * 4 + 0],
        matrix[2 * 4 + 0],
        matrix[3 * 4 + 0],
        matrix[0 * 4 + 1],
        matrix[1 * 4 + 1],
        matrix[2 * 4 + 1],
        matrix[3 * 4 + 1],
        matrix[0 * 4 + 2],
        matrix[1 * 4 + 2],
        matrix[2 * 4 + 2],
        matrix[3 * 4 + 2],
        matrix[0 * 4 + 3],
        matrix[1 * 4 + 3],
        matrix[2 * 4 + 3],
        matrix[3 * 4 + 3],
    ];
}

//=========================================================================================
function InverseTransposeTransformationMatrix( yawPitchRoll, translation, scale ) 
{
    var cosAlpha = Math.cos(yawPitchRoll[2]);
    var sinAlpha = Math.sin(yawPitchRoll[2]);

    var cosBeta = Math.cos(yawPitchRoll[0]);
    var sinBeta = Math.sin(yawPitchRoll[0]);

    var cosGamma = Math.cos(yawPitchRoll[1]);
    var sinGamma = Math.sin(yawPitchRoll[1]);

    var rot = [
        cosAlpha * cosBeta,
        cosAlpha * sinBeta * sinGamma - sinAlpha * cosGamma,
        cosAlpha * sinBeta * cosGamma + sinAlpha * sinGamma,
        0,
        sinAlpha * cosBeta,
        sinAlpha * sinBeta * sinGamma + cosAlpha * cosGamma,
        sinAlpha * sinBeta * cosGamma - cosAlpha * sinGamma,
        0,
        -sinBeta,
        cosBeta * sinGamma,
        cosBeta * cosGamma,
        0,
        0,
        0,
        0,
        1,
    ];
    // inverse of a rotatiuon matrix is it's transpose
    rot = MatrixTranspose4x4(rot);

    var scale = [
        1 / scale[0],
        0,
        0,
        0,
        0,
        1 / scale[1],
        0,
        0,
        0,
        0,
        1 / scale[2],
        0,
        0,
        0,
        0,
        1,
    ];

    var trans = [
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        -translation[0],
        -translation[1],
        -translation[2],
        1,
    ];

    var inverse = MultiplyMatrix4x4( trans, MultiplyMatrix4x4( rot, scale ) );
    return MatrixTranspose4x4( inverse );
}

//=========================================================================================
function MatrixToString(matrix) {
    var ret = "";

    ret +=
        matrix[0 * 4 + 0].toFixed(2) +
        ", " +
        matrix[0 * 4 + 1].toFixed(2) +
        ", " +
        matrix[0 * 4 + 2].toFixed(2) +
        ", " +
        matrix[0 * 4 + 3].toFixed(2) +
        "\n";
    ret +=
        matrix[1 * 4 + 0].toFixed(2) +
        ", " +
        matrix[1 * 4 + 1].toFixed(2) +
        ", " +
        matrix[1 * 4 + 2].toFixed(2) +
        ", " +
        matrix[1 * 4 + 3].toFixed(2) +
        "\n";
    ret +=
        matrix[2 * 4 + 0].toFixed(2) +
        ", " +
        matrix[2 * 4 + 1].toFixed(2) +
        ", " +
        matrix[2 * 4 + 2].toFixed(2) +
        ", " +
        matrix[2 * 4 + 3].toFixed(2) +
        "\n";
    ret +=
        matrix[3 * 4 + 0].toFixed(2) +
        ", " +
        matrix[3 * 4 + 1].toFixed(2) +
        ", " +
        matrix[3 * 4 + 2].toFixed(2) +
        ", " +
        matrix[3 * 4 + 3].toFixed(2) +
        "\n";

    return ret;
}

//=========================================================================================
function NormalizeVector(v) {
    var length = 0;
    for (var i = 0; i < v.length; ++i) length += v[i] * v[i];
    length = Math.sqrt(length);

    var ret = [];
    for (var i = 0; i < v.length; ++i) ret[i] = v[i] / length;

    return ret;
}

//=========================================================================================
function VectorSubtract(a, b) {
    var ret = [];
    for (var i = 0; i < a.length; ++i) ret[i] = a[i] - b[i];
    return ret;
}

//=========================================================================================
function VectorDivide(a, b) {
    var ret = [];
    for (var i = 0; i < a.length; ++i) ret[i] = a[i] / b;
    return ret;
}

//=========================================================================================
function VectorMultiply(a, b) {
    var ret = [];
    for (var i = 0; i < a.length; ++i) ret[i] = a[i] * b;
    return ret;
}

//=========================================================================================
function VectorCrossProduct(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}

//=========================================================================================
function CameraForward() {
    return [
        g_cameraMatrix[ 0 * 4 + 2 ],
        g_cameraMatrix[ 1 * 4 + 2 ],
        g_cameraMatrix[ 2 * 4 + 2 ],
    ];
}

//=========================================================================================
function CameraRight() {
    return [
        g_cameraMatrix[0 * 4 + 0],
        g_cameraMatrix[1 * 4 + 0],
        g_cameraMatrix[2 * 4 + 0],
    ];
}

/**
 * 객체내의 특정 필드 키의 값을 조회 할때 사용. 없으면 에러 투척
 * @param {Object} objectValues 
 * @param {String} key 
 * @returns 
 */
function GetObjectValue( objectValues, key ) {
    if ( objectValues[key] == null )
    {
        throw new Error( "Missing object value asked for in GetObjectValue() : " + key );
    }

    return objectValues[key];
}

//=========================================================================================
function FillUniformValue( key, location, objectValues ) 
{
    // if the shader doesn't use this uniform, nothing to fill in
    if ( location == null ) return;

    // else fill it in with the lambda
    g_uniforms[key][1]( key, location, objectValues );
}

/**
 * 
 * @param {number[]} translation 
 * @param {*} yawPitchRoll 
 * @param {*} scale 
 * @param {*} albedo 
 * @param {*} emissive 
 * @param {*} metallic 
 * @param {*} roughness 
 * @param {*} F0 
 * @param {*} materialTextures 
 * @returns 
 */
function PrepareToDrawMesh( translation, yawPitchRoll, scale, albedo, emissive, metallic, roughness, F0, materialTextures ) 
{
    var skybox = document.getElementById("Debug_SceneIBL");
    skybox = g_skyboxImages[ skybox.options[ skybox.selectedIndex ].value ];

    // get the right shader to use
    var shader = g_shaders[ GetShaderPermutationIndex(
        document.getElementById("Debug_Wireframe").checked,
        materialTextures != null,
        skybox != null,
        document.getElementById("Debug_OutputMode").selectedIndex
    ) ];

    if ( document.getElementById("Debug_Wireframe").checked )
        gl.disable(gl.CULL_FACE);
    else 
        gl.enable(gl.CULL_FACE);

    gl.frontFace( gl.CW );

    // Tell it to use our program ( pair of shaders )
    if ( g_lastShaderUsed != shader.program ) 
    {
        gl.useProgram( shader.program );
        g_lastShaderUsed = shader.program;
    }

    // make our object values
    var objectValues = {};
    objectValues.u_objectMatrix         = TransformationMatrix( yawPitchRoll, translation, scale ) ;
    objectValues.u_invTransObjectMatrix = InverseTransposeTransformationMatrix( yawPitchRoll, translation, scale ) ;
    objectValues.u_objectAlbedo         = albedo ;
    objectValues.u_objectEmissive       = emissive ;
    objectValues.u_objectMetallic       = metallic ;
    objectValues.u_objectRoughness      = roughness ;
    objectValues.u_objectAO             = 1.0 ;
    objectValues.u_objectF0             = F0 ;

    if ( materialTextures != null ) 
    {
        objectValues.u_textureAlbedo    = materialTextures[0];
        objectValues.u_textureMetallic  = materialTextures[1];
        objectValues.u_textureRoughness = materialTextures[2];
        objectValues.u_textureNormal    = materialTextures[3];
        objectValues.u_textureAO        = materialTextures[4];
    }

    if ( skybox ) 
    {
        objectValues.u_splitSum         = g_images["splitsum.png"];
        objectValues.u_diffuseIBL       = skybox[1];
        objectValues.u_specularIBL      = skybox[7];
    }

    objectValues.u_normalMapping        = document.getElementById( "Debug_NormalMapping" ).checked ? 1.0 : 0.0;
    objectValues.u_AO                   = document.getElementById("Debug_AO").checked ? 1.0 : 0.0;
    objectValues.u_lightDirType         = document.getElementById("Debug_LightDirType").checked ? 1.0 : 0.0;

    // fill out the uniforms
    for ( var key in shader.uniforms )
    {
        FillUniformValue( key, shader.uniforms[key], objectValues );
    }

    return shader;
}

//=========================================================================================
function DrawTetrahedron(
    translation,
    yawPitchRoll,
    scale,
    albedo,
    emissive,
    metallic,
    roughness,
    F0,
    materialTextures
) {
    var shader = PrepareToDrawMesh(
        translation,
        yawPitchRoll,
        scale,
        albedo,
        emissive,
        metallic,
        roughness,
        F0,
        materialTextures
    );

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(shader.tetrahedronMesh);

    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = shader.tetrahedronMeshVertCount / 3;
    gl.drawArrays(primitiveType, offset, count);
}


/**
 * 원하는 위치에 원하는 재질로 박스를 렌더링한다.
 * @param {*} translation 
 * @param {*} yawPitchRoll 
 * @param {*} scale 
 * @param {*} albedo 
 * @param {*} emissive 
 * @param {*} metallic 
 * @param {*} roughness 
 * @param {*} F0 
 * @param {*} materialTextures 
 */
function DrawCube( translation, yawPitchRoll, scale,
                   albedo, emissive, metallic, roughness, F0, materialTextures ) 
{
    var shader = PrepareToDrawMesh(
        translation,
        yawPitchRoll,
        scale,
        albedo,
        emissive,
        metallic,
        roughness,
        F0,
        materialTextures
    );

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray( shader.cubeMesh );

    var primitiveType   = gl.TRIANGLES ;
    var offset          = 0 ;
    var count           = shader.cubeMeshVertCount / 3 ;

    gl.drawArrays( primitiveType, offset, count );
}

/**
 * 원하는 위치에 원하는 재질로 구를 렌더링한다.
 * @param {*} translation 
 * @param {*} yawPitchRoll 
 * @param {*} scale 
 * @param {*} albedo 
 * @param {*} emissive 
 * @param {*} metallic 
 * @param {*} roughness 
 * @param {*} F0 
 * @param {*} materialTextures 
 */
function DrawSphere( translation, yawPitchRoll, scale, 
                     albedo, emissive, metallic, roughness, F0, materialTextures )
{
    var shader = PrepareToDrawMesh(
        translation,
        yawPitchRoll,
        scale,
        albedo,
        emissive,
        metallic,
        roughness,
        F0,
        materialTextures
    );

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray( shader.sphereMesh );

    var primitiveType   = gl.TRIANGLES;
    var offset          = 0;
    var count           = shader.sphereMeshVertCount / 3 ;

    gl.drawArrays( primitiveType, offset, count );
}


function DrawSkyboxCube() 
{
    // if no skybox selected, bail out
    var e = document.getElementById("Debug_SceneIBL");
    var skybox = e.options[e.selectedIndex].value;
    if (g_skyboxImages[skybox] == null) return;

    // Tell it to use our program (pair of shaders)
    if ( g_lastShaderUsed != g_skyboxShader.program )
    {
        gl.useProgram( g_skyboxShader.program ) ;
        g_lastShaderUsed = g_skyboxShader.program ;
    }

    // figure out which skybox image to show
    var e = document.getElementById("Debug_SceneIBLWhich");
    var skyboxImageIndex = e.options[e.selectedIndex].value;

    // make our object values
    var objectValues = {};
    objectValues.u_diffuseIBL = g_skyboxImages[skybox][skyboxImageIndex];

    // fill out the uniforms
    for ( var key in g_skyboxShader.uniforms )
    {
        FillUniformValue( key, g_skyboxShader.uniforms[key], objectValues );
    }

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray( g_skyboxShader.cubeMesh );

    gl.depthFunc( gl.LEQUAL ) ;
    gl.disable( gl.CULL_FACE ) ;
    gl.depthMask( 0 ) ;

    var primitiveType   = gl.TRIANGLES;
    var offset          = 0;
    var count           = g_skyboxShader.cubeMeshVertCount / 3 ;

    gl.drawArrays( primitiveType, offset, count );

    gl.depthMask( 1 ) ;
    gl.enable( gl.CULL_FACE ) ;
}

//=========================================================================================
function HandleInput( deltaTime )
{
    if (!g_pointerLocked) return;

    // W or up arrowd
    var movement = g_cameraMoveSpeed * deltaTime;

    if ( g_keyState[87] || g_keyState[38] ) // 'w' or 'up'
    {
        var vec = CameraForward();
        g_cameraPosition[0] -= vec[0] * movement;
        g_cameraPosition[1] -= vec[1] * movement;
        g_cameraPosition[2] -= vec[2] * movement;
        
        UpdateCameraMatrix();

        document.getElementById("CameraPosDisplay").innerText =
            "Camera: (" +
            g_cameraPosition[0].toFixed(2) +
            ", " +
            g_cameraPosition[1].toFixed(2) +
            ", " +
            g_cameraPosition[2].toFixed(2) +
            ")";
    }
    // S or down arrow
    if (g_keyState[83] || g_keyState[40]) {
        var vec = CameraForward();
        g_cameraPosition[0] += vec[0] * movement;
        g_cameraPosition[1] += vec[1] * movement;
        g_cameraPosition[2] += vec[2] * movement;
        UpdateCameraMatrix();

        document.getElementById("CameraPosDisplay").innerText =
            "Camera: (" +
            g_cameraPosition[0].toFixed(2) +
            ", " +
            g_cameraPosition[1].toFixed(2) +
            ", " +
            g_cameraPosition[2].toFixed(2) +
            ")";
    }
    // A or left arrow
    if (g_keyState[65] || g_keyState[37]) {
        var vec = CameraRight();
        g_cameraPosition[0] -= vec[0] * movement;
        g_cameraPosition[1] -= vec[1] * movement;
        g_cameraPosition[2] -= vec[2] * movement;
        UpdateCameraMatrix();

        document.getElementById("CameraPosDisplay").innerText =
            "Camera: (" +
            g_cameraPosition[0].toFixed(2) +
            ", " +
            g_cameraPosition[1].toFixed(2) +
            ", " +
            g_cameraPosition[2].toFixed(2) +
            ")";
    }
    // D or right arrow
    if (g_keyState[68] || g_keyState[39]) {
        var vec = CameraRight();
        g_cameraPosition[0] += vec[0] * movement;
        g_cameraPosition[1] += vec[1] * movement;
        g_cameraPosition[2] += vec[2] * movement;
        UpdateCameraMatrix();

        document.getElementById("CameraPosDisplay").innerText =
            "Camera: (" +
            g_cameraPosition[0].toFixed(2) +
            ", " +
            g_cameraPosition[1].toFixed(2) +
            ", " +
            g_cameraPosition[2].toFixed(2) +
            ")";
    }
}

//=========================================================================================
function DrawScene( thisFrameTimeStamp ) 
{
    // calculate a delta time for our frame
    var deltaTime = 0.0;
    if ( typeof thisFrameTimeStamp != "undefined" ) 
    {
        thisFrameTimeStamp *= 0.001;
        deltaTime = thisFrameTimeStamp - g_lastFrameTimeStamp;
        g_lastFrameTimeStamp = thisFrameTimeStamp;
    }

    // handle FPS calculation
    g_frameCount++ ;
    g_frameCountTime += deltaTime ;
    if ( g_frameCountTime > 0.5 ) 
    {
        var fps = g_frameCount / g_frameCountTime ;

        document.getElementById( "FPSDisplay" ).innerText =
            "(" + gl.canvas.width + "x" + gl.canvas.height + ") FPS: " +
            fps.toFixed(2) +
            " (" + (1000 / fps).toFixed(2) + " ms)" ;

        g_frameCount        = 0 ;
        g_frameCountTime    = 0 ;
    }

    // user input
    HandleInput( deltaTime );

    // Draw
    Resize( gl.canvas );

    gl.viewport( 0, 0, gl.canvas.width, gl.canvas.height );

    // Clear the canvas
    gl.clearColor( g_clearColor[0], g_clearColor[1], g_clearColor[2], 1 );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    // animate object by rotating it over time if we should
    var objectYawPitchRoll = [0, 0, 0];
    if ( document.getElementById("Debug_AnimateObjects").checked ) 
    {
        var seconds             = new Date().getTime() / 1000;
        objectYawPitchRoll[0]   = seconds * 0.25 * 2;
        //objectYawPitchRoll[1]   = seconds * 0.3 * 2;
        //objectYawPitchRoll[2]   = seconds * 0.7 * 2;
    }

    // enable depth test
    gl.enable( gl.DEPTH_TEST );
    gl.depthFunc( gl.LESS );

    // get the material parameters
    var objectMaterialTextures = null;
    var objectAlebdo = [
        document.getElementById("Debug_AlbedoR").value,
        document.getElementById("Debug_AlbedoG").value,
        document.getElementById("Debug_AlbedoB").value,
    ];
    var objectMetallic  = document.getElementById("Debug_Metallic").value;
    var objectRoughness = document.getElementById("Debug_Roughness").value;
    var objectF0        = document.getElementById("Debug_F0").value;

    // set the material textures
    var e = document.getElementById("Debug_SceneMaterial");
    var material = e.options[e.selectedIndex].value;
    if ( g_materials[material] ) 
    {
        objectMaterialTextures = [];
        for ( var index = 0 ; index < g_materials[material].length ; ++index )
            objectMaterialTextures[index] =
                g_images[g_materials[material][index]];
    }

    // draw a grid of things if we are supposed to
    var objectType = document.getElementById("Debug_SceneObject").selectedIndex;
    if ( document.getElementById("Debug_SceneSingle").selectedIndex == 0 ) 
    {
        for (var iy = 0 ; iy < 9 ; ++iy ) 
        {
            for (var ix = 0; ix < 9; ++ix) 
            {
                var rotMultiply = Math.sin((ix + 0.3) * (iy + 0.7)) % 1;

                if (objectType == 0) {
                    DrawSphere(
                        [ix - 4, iy - 4, 0],
                        VectorMultiply(objectYawPitchRoll, rotMultiply),
                        [0.4, 0.4, 0.4],
                        objectAlebdo,
                        [0, 0, 0],
                        (iy * 2) / 8,
                        (ix / 8) * 2.0,
                        objectF0,
                        objectMaterialTextures
                    );
                } else if (objectType == 1) {
                    DrawCube(
                        [ix - 4, iy - 4, 0],
                        VectorMultiply(objectYawPitchRoll, rotMultiply),
                        [0.4, 0.4, 0.4],
                        objectAlebdo,
                        [0, 0, 0],
                        (iy * 2) / 8,
                        (ix / 8) * 2.0,
                        objectF0,
                        objectMaterialTextures
                    );
                } else {
                    DrawTetrahedron(
                        [ix - 4, iy - 4, 0],
                        VectorMultiply(objectYawPitchRoll, rotMultiply),
                        [0.4, 0.4, 0.4],
                        objectAlebdo,
                        [0, 0, 0],
                        (iy / 8) * 2,
                        (ix / 8) * 2.0,
                        objectF0,
                        objectMaterialTextures
                    );
                }
            }
        }
    } 
    else if (
        document.getElementById("Debug_SceneSingle").selectedIndex == 1
    ) 
    {
        for (var iy = 0; iy < 9; ++iy) {
            for (var ix = 0; ix < 9; ++ix) {
                var rotMultiply = Math.sin((ix + 0.3) * (iy + 0.7)) % 1;

                if (objectType == 0) {
                    DrawSphere(
                        [ix - 4, iy - 4, 0],
                        VectorMultiply(objectYawPitchRoll, rotMultiply),
                        [0.4, 0.4, 0.4],
                        objectAlebdo,
                        [0, 0, 0],
                        objectMetallic,
                        objectRoughness,
                        objectF0,
                        objectMaterialTextures
                    );
                } else if (objectType == 1) {
                    DrawCube(
                        [ix - 4, iy - 4, 0],
                        VectorMultiply(objectYawPitchRoll, rotMultiply),
                        [0.4, 0.4, 0.4],
                        objectAlebdo,
                        [0, 0, 0],
                        objectMetallic,
                        objectRoughness,
                        objectF0,
                        objectMaterialTextures
                    );
                } else {
                    DrawTetrahedron(
                        [ix - 4, iy - 4, 0],
                        VectorMultiply(objectYawPitchRoll, rotMultiply),
                        [0.4, 0.4, 0.4],
                        objectAlebdo,
                        [0, 0, 0],
                        objectMetallic,
                        objectRoughness,
                        objectF0,
                        objectMaterialTextures
                    );
                }
            }
        }
    } 
    else if (
        document.getElementById("Debug_SceneSingle").selectedIndex == 2
    ) 
    {
        for (var iz = 0; iz < 9; ++iz) {
            for (var iy = 0; iy < 9; ++iy) {
                for (var ix = 0; ix < 9; ++ix) {
                    var rotMultiply =
                        Math.sin((ix + 0.3) * (iy + 0.7) * (iz + 0.5)) % 1;

                    if (objectType == 0) {
                        DrawSphere(
                            [ix - 4, iy - 4, iz - 8],
                            VectorMultiply(objectYawPitchRoll, rotMultiply),
                            [0.4, 0.4, 0.4],
                            objectAlebdo,
                            [0, 0, 0],
                            objectMetallic,
                            objectRoughness,
                            objectF0,
                            objectMaterialTextures
                        );
                    } else if (objectType == 1) {
                        DrawCube(
                            [ix - 4, iy - 4, iz - 8],
                            VectorMultiply(objectYawPitchRoll, rotMultiply),
                            [0.4, 0.4, 0.4],
                            objectAlebdo,
                            [0, 0, 0],
                            objectMetallic,
                            objectRoughness,
                            objectF0,
                            objectMaterialTextures
                        );
                    } else {
                        DrawTetrahedron(
                            [ix - 4, iy - 4, iz - 8],
                            VectorMultiply(objectYawPitchRoll, rotMultiply),
                            [0.4, 0.4, 0.4],
                            objectAlebdo,
                            [0, 0, 0],
                            objectMetallic,
                            objectRoughness,
                            objectF0,
                            objectMaterialTextures
                        );
                    }
                }
            }
        }
    }
    // else draw a single one
    else 
    {
        if (objectType == 0) {
            DrawSphere(
                [0, 0, 0],
                objectYawPitchRoll,
                [1, 1, 1],
                objectAlebdo,
                [0, 0, 0],
                objectMetallic,
                objectRoughness,
                objectF0,
                objectMaterialTextures
            );
        } else if (objectType == 1) {
            DrawCube(
                [0, 0, 0],
                objectYawPitchRoll,
                [1, 1, 1],
                objectAlebdo,
                [0, 0, 0],
                objectMetallic,
                objectRoughness,
                objectF0,
                objectMaterialTextures
            );
        } else {
            DrawTetrahedron(
                [0, 0, 0],
                objectYawPitchRoll,
                [1, 1, 1],
                objectAlebdo,
                [0, 0, 0],
                objectMetallic,
                objectRoughness,
                objectF0,
                objectMaterialTextures
            );
        }
    }

    // draw the light sources if we should
    if ( document.getElementById("Debug_DrawPointLights").checked ) 
    {
        var color = GetLightColor( 0 );
        DrawSphere( 
            GetLightPos( 0 ), [0, 0, 0], [0.1, 0.1, 0.1],
            [0, 0, 0], color, 0, 0, 0, null
        );
        color = GetLightColor( 1 );
        DrawSphere(
            GetLightPos( 1 ), [0, 0, 0], [0.1, 0.1, 0.1],
            [0, 0, 0], color, 0, 0, 0, null
        );
        color = GetLightColor( 2 );
        DrawSphere(
            GetLightPos( 2 ), [0, 0, 0], [0.1, 0.1, 0.1],
            [0, 0, 0], color, 0, 0, 0, null
        );
        color = GetLightColor( 3 );
        DrawSphere(
            GetLightPos( 3 ), [0, 0, 0], [0.1, 0.1, 0.1],
            [0, 0, 0], color, 0, 0, 0, null
        );
    }

    // draw the skybox last
    DrawSkyboxCube();

    // request another frame to be drawn
    requestAnimationFrame( DrawScene );
}

//=========================================================================================
function ToggleDebugPanel() 
{
    g_debugPanelOpen = !g_debugPanelOpen;

    if (g_debugPanelOpen) 
    {
        document.getElementById("DebugPanelControls").style.visibility  = "visible";
        document.getElementById("DebugPanelControls").style.display     = "";

        document.getElementById("DebugPanelCollapseIcon").innerText     = "[close] Debug Panel";
    } 
    else 
    {
        document.getElementById("DebugPanelControls").style.visibility  = "hidden";
        document.getElementById("DebugPanelControls").style.display     = "none";

        document.getElementById("DebugPanelCollapseIcon").innerText     = "[open] Debug Panel";
    }
}

/**
 * 
 * @param {KeyboardEvent} event 
 */
function OnKeyDown( event ) 
{
    g_keyState[ event.keyCode ] = true ;
}

function OnKeyUp( event ) 
{
    g_keyState[ event.keyCode ] = false ;
}

function OnRenderWindowClick() 
{
    if ( !g_pointerLocked ) 
    {
        g_canvas.requestPointerLock();
    }
}

function PointerLockChangeCallback() 
{
    if ( document.pointerLockElement        === g_canvas ||
         document.mozPointerLockElement     === g_canvas ||
         document.webkitPointerLockElement  === g_canvas ) 
    {
        // Pointer was just locked
        // Enable the mousemove listener
        document.addEventListener( "mousemove", MouseMoveCallback, false );
        g_pointerLocked = true;
    } 
    else 
    {
        // Pointer was just unlocked
        // Disable the mousemove listener
        document.removeEventListener( "mousemove", MouseMoveCallback, false );
        g_pointerLocked = false;
    }
}

/**
 * 
 * @param {MouseEvent} e 
 */
function MouseMoveCallback( e )
{

    var movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0 ;
    var movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0 ;

    g_cameraYawPitchRoll[0] -= g_cameraRotateSpeed * movementX ;
    g_cameraYawPitchRoll[1] -= g_cameraRotateSpeed * movementY ;

    // limit pitch to keep from flipping over
    if ( g_cameraYawPitchRoll[1] < -Math.PI / 2 )
        g_cameraYawPitchRoll[1] = -Math.PI / 2 ;
    else if ( g_cameraYawPitchRoll[1] > Math.PI / 2 )
        g_cameraYawPitchRoll[1] = Math.PI / 2 ;

    UpdateCameraMatrix();
}


/**
 * 정점들의 위치 정보로 부터 법선벡터 계산하기
 * @param {number[]} pos 
 * @returns {number[]}
 */
function CalculateNormals( pos ) 
{

    var normals = [];

    // for each triangle
    for ( var index = 0 ; index < pos.length ; index += 9 ) 
    {
        var point0  = pos.slice( index + 0, index + 3 );
        var point1  = pos.slice( index + 3, index + 6 );
        var point2  = pos.slice( index + 6, index + 9 );

        var edge1   = VectorSubtract( point1, point0 );
        var edge2   = VectorSubtract( point2, point1 );

        var normal  = NormalizeVector( VectorCrossProduct( edge2, edge1 ) );

        normals     = normals.concat( normal );
        normals     = normals.concat( normal );
        normals     = normals.concat( normal );
    }

    return normals;
}

// TODO: could we calculate normals and tangents at the same time? what about sphere that doesn't want calculated normals? Maybe it ignores that part?
// TODO: Note the difference in calculating edge2 below vs above.  Maybe convert above to look like below first and then merge functions?
// TODO: does a sphere want smoothed tangents? not sure if it will make a difference or not.  I think it will, when looking at the tangent output.

//=========================================================================================

/**
 * 
 * @param {number[]} pos 
 * @param {number[]} uv 
 * @returns {number[]}
 */
function CalculateTangents( pos, uv ) 
{

    var tangents = [];

    // for each triangle
    var uvIndex = 0;
    for ( var index = 0 ; index < pos.length ; index += 9 ) 
    {
        var point0  = pos.slice( index + 0, index + 3 );
        var point1  = pos.slice( index + 3, index + 6 );
        var point2  = pos.slice( index + 6, index + 9 );

        var uv0     = uv.slice( uvIndex + 0, uvIndex + 2 );
        var uv1     = uv.slice( uvIndex + 2, uvIndex + 4 );
        var uv2     = uv.slice( uvIndex + 4, uvIndex + 6 );

        var edge1   = VectorSubtract( point1, point0 );
        var edge2   = VectorSubtract( point2, point0 );

        var deltaUV1 = VectorSubtract( uv1, uv0 );
        var deltaUV2 = VectorSubtract( uv2, uv0 );

        var f       = 1 / ( deltaUV1[0] * deltaUV2[1] - deltaUV2[0] * deltaUV1[1] );

        var tangent = [];
        tangent[0]  = f * ( deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0] );
        tangent[1]  = f * ( deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1] );
        tangent[2]  = f * ( deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2] );

        tangents    = tangents.concat( tangent );
        tangents    = tangents.concat( tangent );
        tangents    = tangents.concat( tangent );

        uvIndex     += 6;
    }

    return tangents;
}


/**
 * 내부 셰이더 객체
 * @typedef {Object} MYMesh
 * @property {number[]} pos
 * @property {number[]} norm
 * @property {number[]} tangent
 * @property {number[]} uv
 * @property {number[]} barycentric
 */

/**
 * 
 * @returns {MYMesh}
 */
function GenerateTetrahedronMesh()
{
    var ret = {};

    var pos = [];
    var uv = [];

    var point0 = [-1, 0, -1 / Math.sqrt(2)];
    var point1 = [1, 0, -1 / Math.sqrt(2)];
    var point2 = [0, -1, 1 / Math.sqrt(2)];
    var point3 = [0, 1, 1 / Math.sqrt(2)];

    pos = pos.concat(point2);
    pos = pos.concat(point1);
    pos = pos.concat(point0);

    pos = pos.concat(point0);
    pos = pos.concat(point1);
    pos = pos.concat(point3);

    pos = pos.concat(point3);
    pos = pos.concat(point2);
    pos = pos.concat(point0);

    pos = pos.concat(point1);
    pos = pos.concat(point2);
    pos = pos.concat(point3);

    uv = uv.concat([0, 0]);
    uv = uv.concat([0.5, 1]);
    uv = uv.concat([1, 0]);

    uv = uv.concat([0, 0]);
    uv = uv.concat([0.5, 1]);
    uv = uv.concat([1, 0]);

    uv = uv.concat([0, 0]);
    uv = uv.concat([0.5, 1]);
    uv = uv.concat([1, 0]);

    uv = uv.concat([0, 0]);
    uv = uv.concat([0.5, 1]);
    uv = uv.concat([1, 0]);

    // make the normals and tangents
    var norm = CalculateNormals(pos);
    var tangent = CalculateTangents(pos, uv);

    // make barycentric coordinates
    var barycentric = [];
    for (var i = 0; i < pos.length; i += 9) {
        barycentric = barycentric.concat([1, 0, 0]);
        barycentric = barycentric.concat([0, 1, 0]);
        barycentric = barycentric.concat([0, 0, 1]);
    }

    ret.pos = pos;
    ret.norm = norm;
    ret.uv = uv;
    ret.barycentric = barycentric;
    ret.tangent = tangent;

    return ret;
}

//=========================================================================================
function GenerateCubeMesh()
{
    var ret = {};

    var pos = [];
    var uv = [];

    // front face
    {
        pos = pos.concat([-1, -1, 1]);
        pos = pos.concat([-1, 1, 1]);
        pos = pos.concat([1, -1, 1]);

        pos = pos.concat([-1, 1, 1]);
        pos = pos.concat([1, 1, 1]);
        pos = pos.concat([1, -1, 1]);

        uv = uv.concat([0, 0]);
        uv = uv.concat([0, 1]);
        uv = uv.concat([1, 0]);

        uv = uv.concat([0, 1]);
        uv = uv.concat([1, 1]);
        uv = uv.concat([1, 0]);
    }

    // back face
    {
        pos = pos.concat([1, -1, -1]);
        pos = pos.concat([-1, 1, -1]);
        pos = pos.concat([-1, -1, -1]);

        pos = pos.concat([1, -1, -1]);
        pos = pos.concat([1, 1, -1]);
        pos = pos.concat([-1, 1, -1]);

        uv = uv.concat([1, 0]);
        uv = uv.concat([0, 1]);
        uv = uv.concat([0, 0]);

        uv = uv.concat([1, 0]);
        uv = uv.concat([1, 1]);
        uv = uv.concat([0, 1]);
    }

    // left face
    {
        pos = pos.concat([-1, -1, -1]);
        pos = pos.concat([-1, 1, -1]);
        pos = pos.concat([-1, -1, 1]);

        pos = pos.concat([-1, 1, -1]);
        pos = pos.concat([-1, 1, 1]);
        pos = pos.concat([-1, -1, 1]);

        uv = uv.concat([0, 0]);
        uv = uv.concat([0, 1]);
        uv = uv.concat([1, 0]);

        uv = uv.concat([0, 1]);
        uv = uv.concat([1, 1]);
        uv = uv.concat([1, 0]);
    }

    // right face
    {
        pos = pos.concat([1, -1, 1]);
        pos = pos.concat([1, 1, -1]);
        pos = pos.concat([1, -1, -1]);

        pos = pos.concat([1, -1, 1]);
        pos = pos.concat([1, 1, 1]);
        pos = pos.concat([1, 1, -1]);

        uv = uv.concat([1, 0]);
        uv = uv.concat([0, 1]);
        uv = uv.concat([0, 0]);

        uv = uv.concat([1, 0]);
        uv = uv.concat([1, 1]);
        uv = uv.concat([0, 1]);
    }

    // top face
    {
        pos = pos.concat([-1, -1, -1]);
        pos = pos.concat([-1, -1, 1]);
        pos = pos.concat([1, -1, -1]);

        pos = pos.concat([-1, -1, 1]);
        pos = pos.concat([1, -1, 1]);
        pos = pos.concat([1, -1, -1]);

        uv = uv.concat([0, 0]);
        uv = uv.concat([0, 1]);
        uv = uv.concat([1, 0]);

        uv = uv.concat([0, 1]);
        uv = uv.concat([1, 1]);
        uv = uv.concat([1, 0]);
    }

    // bottom face
    {
        pos = pos.concat([1, 1, -1]);
        pos = pos.concat([-1, 1, 1]);
        pos = pos.concat([-1, 1, -1]);

        pos = pos.concat([1, 1, -1]);
        pos = pos.concat([1, 1, 1]);
        pos = pos.concat([-1, 1, 1]);

        uv = uv.concat([1, 0]);
        uv = uv.concat([0, 1]);
        uv = uv.concat([0, 0]);

        uv = uv.concat([1, 0]);
        uv = uv.concat([1, 1]);
        uv = uv.concat([0, 1]);
    }

    // make the normals and tangents
    var norm = CalculateNormals(pos);
    var tangent = CalculateTangents(pos, uv);

    // make barycentric coordinates
    var barycentric = [];
    for (var i = 0; i < pos.length; i += 9) {
        barycentric = barycentric.concat([1, 0, 0]);
        barycentric = barycentric.concat([0, 1, 0]);
        barycentric = barycentric.concat([0, 0, 1]);
    }

    ret.pos = pos;
    ret.norm = norm;
    ret.uv = uv;
    ret.barycentric = barycentric;
    ret.tangent = tangent;

    return ret;
}


/**
 * 
 * @param {number} slicesX 
 * @param {number} slicesY 
 * @returns {MYMesh}
 */
function GenerateSphereMesh( slicesX, slicesY )
{

    /**@type {MYMesh}*/
    var ret     = {};

    var pos     = [];
    var uv      = [];

    // make the body of the sphere
    for ( var indexY = 1 ; indexY < slicesY - 1 ; ++indexY ) 
    {
        var percentY1 = (indexY + 0) / slicesY;
        var percentY2 = (indexY + 1) / slicesY;
        for ( var indexX = 0 ; indexX < slicesX; ++indexX ) 
        {
            var percentX1 = ( indexX + 0 ) / slicesX;
            var percentX2 = ( indexX + 1 ) / slicesX;

            var point00 = [
                Math.cos( percentX1 * 2 * Math.PI ) * Math.sin( percentY1 * Math.PI ),
                Math.cos( percentY1 * Math.PI ),
                Math.sin( percentX1 * 2 * Math.PI ) * Math.sin( percentY1 * Math.PI ),
            ];
            var point10 = [
                Math.cos( percentX2 * 2 * Math.PI ) * Math.sin( percentY1 * Math.PI ),
                Math.cos( percentY1 * Math.PI ),
                Math.sin( percentX2 * 2 * Math.PI ) * Math.sin( percentY1 * Math.PI ),
            ];
            var point01 = [
                Math.cos( percentX1 * 2 * Math.PI ) * Math.sin( percentY2 * Math.PI ),
                Math.cos( percentY2 * Math.PI ),
                Math.sin( percentX1 * 2 * Math.PI ) * Math.sin( percentY2 * Math.PI ),
            ];
            var point11 = [
                Math.cos( percentX2 * 2 * Math.PI ) * Math.sin( percentY2 * Math.PI ),
                Math.cos( percentY2 * Math.PI ),
                Math.sin( percentX2 * 2 * Math.PI ) * Math.sin( percentY2 * Math.PI ),
            ];

            var uv00 = [percentX1, percentY1];
            var uv10 = [percentX2, percentY1];
            var uv01 = [percentX1, percentY2];
            var uv11 = [percentX2, percentY2];

            // triangle 1 = 00, 01, 10
            pos     = pos.concat( point00 );
            pos     = pos.concat( point01 );
            pos     = pos.concat( point10 );

            uv      = uv.concat( uv00 );
            uv      = uv.concat( uv01 );
            uv      = uv.concat( uv10 );

            // triangle 2 = 01, 11, 10
            pos = pos.concat(point01);
            pos = pos.concat(point11);
            pos = pos.concat(point10);

            uv = uv.concat(uv01);
            uv = uv.concat(uv11);
            uv = uv.concat(uv10);
        }
    }

    // make the caps of the sphere
    for (var indexX = 0; indexX < slicesX; ++indexX) {
        var percentX1 = indexX / slicesX;
        var percentX2 = (indexX + 1) / slicesX;

        var percentY = 1 / slicesY;

        var point0 = [0, 1, 0];
        var point1 = [
            Math.cos(percentX1 * 2 * Math.PI) * Math.sin(percentY * Math.PI),
            Math.cos(percentY * Math.PI),
            Math.sin(percentX1 * 2 * Math.PI) * Math.sin(percentY * Math.PI),
        ];
        var point2 = [
            Math.cos(percentX2 * 2 * Math.PI) * Math.sin(percentY * Math.PI),
            Math.cos(percentY * Math.PI),
            Math.sin(percentX2 * 2 * Math.PI) * Math.sin(percentY * Math.PI),
        ];

        var uv0 = [0, 0];
        var uv1 = [percentX1, percentY];
        var uv2 = [percentX2, percentY];

        pos = pos.concat(point0);
        pos = pos.concat(point1);
        pos = pos.concat(point2);

        uv = uv.concat(uv0);
        uv = uv.concat(uv1);
        uv = uv.concat(uv2);

        percentY = 1.0 - percentY;

        point2 = [0, -1, 0];
        point1 = [
            Math.cos(percentX1 * 2 * Math.PI) * Math.sin(percentY * Math.PI),
            Math.cos(percentY * Math.PI),
            Math.sin(percentX1 * 2 * Math.PI) * Math.sin(percentY * Math.PI),
        ];
        point0 = [
            Math.cos(percentX2 * 2 * Math.PI) * Math.sin(percentY * Math.PI),
            Math.cos(percentY * Math.PI),
            Math.sin(percentX2 * 2 * Math.PI) * Math.sin(percentY * Math.PI),
        ];

        var uv2 = [0, 1];
        var uv1 = [percentX1, percentY];
        var uv0 = [percentX2, percentY];

        pos = pos.concat(point0);
        pos = pos.concat(point1);
        pos = pos.concat(point2);

        uv = uv.concat(uv0);
        uv = uv.concat(uv1);
        uv = uv.concat(uv2);
    }

    // make the normals. We want smoothed normals on the sphere
    var norm        = pos;

    // make the tangents
    var tangent     = CalculateTangents( pos, uv );

    // make barycentric coordinates
    var barycentric = [];
    for ( var i = 0 ; i < pos.length ; i += 9 ) 
    {
        barycentric = barycentric.concat( [1, 0, 0] );
        barycentric = barycentric.concat( [0, 1, 0] );
        barycentric = barycentric.concat( [0, 0, 1] );
    }

    ret.pos         = pos;
    ret.norm        = norm;
    ret.uv          = uv;
    ret.barycentric = barycentric;
    ret.tangent     = tangent;

    return ret;
}

/**
 * 
 * @param {String} url 
 * @param {Function} callback 
 * @returns 
 */
function loadImage( url, callback ) {
    var image       = new Image();
    image.src       = url;
    image.onload    = callback;
    image.rawSrc    = url;
    return image;
}

//=========================================================================================
function MakeSkyboxImagePath( type, path, suffix )
{
    //types:
    // 0 = skybox
    // 1 = diffuse
    // 2 = specular mip 0
    // 3 = specular mip 1
    // 4 = specular mip 2
    // 5 = specular mip 3
    // 6 = specular mip 4
    if (type == 0) return path + suffix;
    else if (type == 1) return path + "Diffuse" + suffix;
    else return path + (type - 2) + "Specular" + suffix;
}

/**
 * 텍스쳐 이미지 다운로드 후 HTMLImageElement[] 배열로 저장
 */
function LoadImagesAndRender() 
{
    // get the unique list of images to load
    var loadingImagesSet = new Set();
    for ( var index = 0 ; index < g_loadImages.length ; ++index )
    {
        loadingImagesSet.add( g_loadImages[ index ] );
    }
    for ( var key in g_materials ) 
    {
        for ( var index = 0 ; index < g_materials[key].length ; ++index ) 
        {
            loadingImagesSet.add( g_materials[key][index] );
        }
    }
    for ( var key in g_skyboxes ) 
    {
        for ( var type = 0 ; type <= 6 ; ++type ) 
        {
            loadingImagesSet.add(
                MakeSkyboxImagePath( type, g_skyboxes[key], "Back.png" )
            );
            loadingImagesSet.add(
                MakeSkyboxImagePath( type, g_skyboxes[key], "Down.png" )
            );
            loadingImagesSet.add(
                MakeSkyboxImagePath( type, g_skyboxes[key], "Front.png" )
            );
            loadingImagesSet.add(
                MakeSkyboxImagePath( type, g_skyboxes[key], "Left.png" )
            );
            loadingImagesSet.add(
                MakeSkyboxImagePath( type, g_skyboxes[key], "Right.png" )
            );
            loadingImagesSet.add(
                MakeSkyboxImagePath( type, g_skyboxes[key], "Up.png" )
            );
        }
    }

    var loadingImages       = Array.from( loadingImagesSet );
    var imagesToLoad        = loadingImages.length;
    var totalImagesToLoad   = imagesToLoad;

    /**
     * @type {Image[]}
     */
    var images              = [];

    document.getElementById("Loading").innerText =
        "Loading Images: " +
        ( totalImagesToLoad - imagesToLoad + 1 ) +
        " / " +
        totalImagesToLoad ;
    document.getElementById("Loading").style.left = "50%";

    // Called each time an image finished loading.
    var onImageLoad = function () {

        --imagesToLoad;

        // update the loading progress overlay
        document.getElementById("Loading").innerText =
            "Loading Images: " +
            (totalImagesToLoad - imagesToLoad + 1) +
            " / " +
            totalImagesToLoad;
        document.getElementById("Loading").style.left = "50%";

        // If all the images are loaded call the callback.
        if ( imagesToLoad == 0 ) 
        {
            // hide the loading progress overlay
            document.getElementById("Loading").style.visibility = "hidden";

            // create all the 2d images (even of skybox images, in case we want to use them for 2d stuff for some reason)
            for ( var i = 0 ; i < images.length ; ++i )
            {
                var texture = gl.createTexture() ;
                gl.bindTexture( gl.TEXTURE_2D, texture );

                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    images[i]
                );

                gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT );
                gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT );
                gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR );
                gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
                gl.generateMipmap( gl.TEXTURE_2D );

                g_images[loadingImages[i]] = texture;
            }

            gl.bindTexture( gl.TEXTURE_2D, null );

            // create all the skyboxes
            for ( var key in g_skyboxes )
            {
                // create the individual skyboxes
                g_skyboxImages[key] = [];
                for ( var type = 0 ; type <= 6 ; ++type ) 
                {
                    var texture = gl.createTexture() ;
                    gl.bindTexture( gl.TEXTURE_CUBE_MAP, texture ) ;

                    for ( var imageIndex = 0 ; imageIndex < images.length ; ++imageIndex )
                    {
                        var side = null;

                        if ( images[ imageIndex ].rawSrc == MakeSkyboxImagePath( type, g_skyboxes[ key ], "Back.png" ) )
                            side = gl.TEXTURE_CUBE_MAP_NEGATIVE_Z;
                        else if ( images[ imageIndex ].rawSrc == MakeSkyboxImagePath( type, g_skyboxes[ key ], "Down.png" ) )
                            side = gl.TEXTURE_CUBE_MAP_NEGATIVE_Y;
                        else if ( images[ imageIndex ].rawSrc == MakeSkyboxImagePath( type, g_skyboxes[ key ], "Front.png" ) )
                            side = gl.TEXTURE_CUBE_MAP_POSITIVE_Z;
                        else if ( images[ imageIndex ].rawSrc == MakeSkyboxImagePath( type, g_skyboxes[ key ], "Left.png" ) )
                            side = gl.TEXTURE_CUBE_MAP_NEGATIVE_X;
                        else if ( images[ imageIndex ].rawSrc == MakeSkyboxImagePath( type, g_skyboxes[ key ], "Right.png" ) )
                            side = gl.TEXTURE_CUBE_MAP_POSITIVE_X;
                        else if ( images[ imageIndex ].rawSrc == MakeSkyboxImagePath( type, g_skyboxes[ key ], "Up.png" ) )
                            side = gl.TEXTURE_CUBE_MAP_POSITIVE_Y;
                        else continue;

                        gl.texImage2D(
                            side,
                            0,
                            gl.RGBA,
                            gl.RGBA,
                            gl.UNSIGNED_BYTE,
                            images[ imageIndex ]
                        );
                    }

                    gl.texParameteri(
                        gl.TEXTURE_CUBE_MAP,
                        gl.TEXTURE_MIN_FILTER,
                        gl.LINEAR
                    );
                    gl.texParameteri(
                        gl.TEXTURE_CUBE_MAP,
                        gl.TEXTURE_MAG_FILTER,
                        gl.LINEAR
                    );
                    gl.texParameteri(
                        gl.TEXTURE_CUBE_MAP,
                        gl.TEXTURE_WRAP_S,
                        gl.CLAMP_TO_EDGE
                    );
                    gl.texParameteri(
                        gl.TEXTURE_CUBE_MAP,
                        gl.TEXTURE_WRAP_T,
                        gl.CLAMP_TO_EDGE
                    );
                    gl.texParameteri(
                        gl.TEXTURE_CUBE_MAP,
                        gl.TEXTURE_WRAP_R,
                        gl.CLAMP_TO_EDGE
                    );

                    g_skyboxImages[key][type] = texture;
                }

                // create the custom mip mapped sky boxes (pre-integrated roughness)
                var texture = gl.createTexture();
                gl.bindTexture( gl.TEXTURE_CUBE_MAP, texture );

                // first we have to fill in mip zero with data
                for ( var imageIndex = 0; imageIndex < images.length; ++imageIndex )
                {
                    var side = null;

                    {
                        var type = 2;
                        var mip = type - 2;

                        if (
                            images[imageIndex].rawSrc ==
                            MakeSkyboxImagePath(
                                type,
                                g_skyboxes[key],
                                "Back.png"
                            )
                        )
                            side = gl.TEXTURE_CUBE_MAP_NEGATIVE_Z;
                        else if (
                            images[imageIndex].rawSrc ==
                            MakeSkyboxImagePath(
                                type,
                                g_skyboxes[key],
                                "Down.png"
                            )
                        )
                            side = gl.TEXTURE_CUBE_MAP_NEGATIVE_Y;
                        else if (
                            images[imageIndex].rawSrc ==
                            MakeSkyboxImagePath(
                                type,
                                g_skyboxes[key],
                                "Front.png"
                            )
                        )
                            side = gl.TEXTURE_CUBE_MAP_POSITIVE_Z;
                        else if (
                            images[imageIndex].rawSrc ==
                            MakeSkyboxImagePath(
                                type,
                                g_skyboxes[key],
                                "Left.png"
                            )
                        )
                            side = gl.TEXTURE_CUBE_MAP_NEGATIVE_X;
                        else if (
                            images[imageIndex].rawSrc ==
                            MakeSkyboxImagePath(
                                type,
                                g_skyboxes[key],
                                "Right.png"
                            )
                        )
                            side = gl.TEXTURE_CUBE_MAP_POSITIVE_X;
                        else if (
                            images[imageIndex].rawSrc ==
                            MakeSkyboxImagePath(type, g_skyboxes[key], "Up.png")
                        )
                            side = gl.TEXTURE_CUBE_MAP_POSITIVE_Y;
                        else continue;

                        gl.texImage2D(
                            side,
                            mip,
                            gl.RGBA,
                            gl.RGBA,
                            gl.UNSIGNED_BYTE,
                            images[imageIndex]
                        );
                    }
                }

                // then we can generate mipmaps from that data
                gl.generateMipmap( gl.TEXTURE_CUBE_MAP );

                // then we can fill in the mips with our custom images
                for ( var imageIndex = 0 ; imageIndex < images.length ; ++imageIndex )
                {
                    var side = null;

                    for (var type = 3; type <= 6; ++type) {
                        var mip = type - 2;

                        if (
                            images[imageIndex].rawSrc ==
                            MakeSkyboxImagePath(
                                type,
                                g_skyboxes[key],
                                "Back.png"
                            )
                        )
                            side = gl.TEXTURE_CUBE_MAP_NEGATIVE_Z;
                        else if (
                            images[imageIndex].rawSrc ==
                            MakeSkyboxImagePath(
                                type,
                                g_skyboxes[key],
                                "Down.png"
                            )
                        )
                            side = gl.TEXTURE_CUBE_MAP_NEGATIVE_Y;
                        else if (
                            images[imageIndex].rawSrc ==
                            MakeSkyboxImagePath(
                                type,
                                g_skyboxes[key],
                                "Front.png"
                            )
                        )
                            side = gl.TEXTURE_CUBE_MAP_POSITIVE_Z;
                        else if (
                            images[imageIndex].rawSrc ==
                            MakeSkyboxImagePath(
                                type,
                                g_skyboxes[key],
                                "Left.png"
                            )
                        )
                            side = gl.TEXTURE_CUBE_MAP_NEGATIVE_X;
                        else if (
                            images[imageIndex].rawSrc ==
                            MakeSkyboxImagePath(
                                type,
                                g_skyboxes[key],
                                "Right.png"
                            )
                        )
                            side = gl.TEXTURE_CUBE_MAP_POSITIVE_X;
                        else if (
                            images[imageIndex].rawSrc ==
                            MakeSkyboxImagePath(type, g_skyboxes[key], "Up.png")
                        )
                            side = gl.TEXTURE_CUBE_MAP_POSITIVE_Y;
                        else continue;

                        gl.texImage2D(
                            side,
                            mip,
                            gl.RGBA,
                            gl.RGBA,
                            gl.UNSIGNED_BYTE,
                            images[imageIndex]
                        );
                    }
                }

                gl.texParameteri(
                    gl.TEXTURE_CUBE_MAP,
                    gl.TEXTURE_MIN_FILTER,
                    gl.LINEAR_MIPMAP_LINEAR
                );
                gl.texParameteri(
                    gl.TEXTURE_CUBE_MAP,
                    gl.TEXTURE_MAG_FILTER,
                    gl.LINEAR
                );
                gl.texParameteri(
                    gl.TEXTURE_CUBE_MAP,
                    gl.TEXTURE_WRAP_S,
                    gl.CLAMP_TO_EDGE
                );
                gl.texParameteri(
                    gl.TEXTURE_CUBE_MAP,
                    gl.TEXTURE_WRAP_T,
                    gl.CLAMP_TO_EDGE
                );
                gl.texParameteri(
                    gl.TEXTURE_CUBE_MAP,
                    gl.TEXTURE_WRAP_R,
                    gl.CLAMP_TO_EDGE
                );

                g_skyboxImages[key][7] = texture;
            }
            gl.bindTexture( gl.TEXTURE_CUBE_MAP, null );

            // start rendering
            DrawScene();
        }
    };

    for ( var i = 0; i < loadingImages.length ; ++i ) 
    {
        var image = loadImage( loadingImages[i], onImageLoad );
        images.push( image );
    }
}

/**
 * 메시용 정점버퍼 및 인덱스버퍼 생성
 * @param {MYMesh} mesh 
 * @param {WebGLProgram} program 
 */
function MakeMeshBuffers( mesh, program ) 
{

    // normals
    var normalAttributeLocation = gl.getAttribLocation( program, "a_normal" );
    if ( normalAttributeLocation != -1 ) 
    {
        var normalBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
        gl.enableVertexAttribArray( normalAttributeLocation );
        gl.vertexAttribPointer( normalAttributeLocation, 3, gl.FLOAT, false, 0, 0 );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( mesh.norm ), gl.STATIC_DRAW );
    }

    // tangents
    var tangentAttributeLocation = gl.getAttribLocation( program, "a_tangent" );
    if ( tangentAttributeLocation != -1 ) 
    {
        var tangentBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, tangentBuffer );
        gl.enableVertexAttribArray( tangentAttributeLocation );
        gl.vertexAttribPointer( tangentAttributeLocation, 3, gl.FLOAT, false, 0, 0 );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( mesh.tangent ), gl.STATIC_DRAW );
    }

    // positions
    var positionAttributeLocation = gl.getAttribLocation( program, "a_position" );
    if ( positionAttributeLocation != -1 ) 
    {
        var positionBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
        gl.enableVertexAttribArray( positionAttributeLocation );
        gl.vertexAttribPointer( positionAttributeLocation, 3, gl.FLOAT, false, 0, 0 );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( mesh.pos ), gl.STATIC_DRAW );
    }

    // uv
    var uvAttributeLocation = gl.getAttribLocation( program, "a_uv" );
    if ( uvAttributeLocation != -1 ) 
    {
        var uvBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, uvBuffer );
        gl.enableVertexAttribArray( uvAttributeLocation );
        gl.vertexAttribPointer( uvAttributeLocation, 2, gl.FLOAT, false, 0, 0 );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( mesh.uv ), gl.STATIC_DRAW );
    }

    // barycentric coordinates
    var barycentricAttributeLocation = gl.getAttribLocation( program, "a_barycentric" );
    if ( barycentricAttributeLocation != -1 ) 
    {
        var barycentricBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, barycentricBuffer );
        gl.enableVertexAttribArray( barycentricAttributeLocation );
        gl.vertexAttribPointer( barycentricAttributeLocation, 3, gl.FLOAT, false, 0, 0 );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( mesh.barycentric ), gl.STATIC_DRAW );
    }
}

/**
 * 앱 초기화
 * @returns 
 */
function Initialize() 
{

    // fill in the material drop down list
    var option;
    for ( var key in g_materials ) 
    {
        option      = document.createElement("option");
        option.text = key;

        document.getElementById("Debug_SceneMaterial").add( option );
    }
    option          = document.createElement("option");
    option.text     = "Untextured";
    document.getElementById("Debug_SceneMaterial").add( option );

    // fill in the IBL list
    for ( var key in g_skyboxes ) 
    {
        option      = document.createElement("option");
        option.text = key;
        document.getElementById("Debug_SceneIBL").add(option);
    }
    option          = document.createElement("option");
    option.text     = "None";
    document.getElementById("Debug_SceneIBL").add(option);

    //debug panel starts closed
    ToggleDebugPanel();

    var havePointerLock = "pointerLockElement" in document || "mozPointerLockElement" in document || "webkitPointerLockElement" in document;

    // initialize webgl2
    g_canvas        = document.getElementById("RenderWindow");
    gl              = g_canvas.getContext("webgl2");
    if ( !gl ) 
    {
        alert("could not get webgl2 context!");
        return;
    }

    // setup pointer lock to activate later
    if ( !havePointerLock ) 
    {
        alert("your browser does not support pointer lock");
        return;
    }
    g_canvas.requestPointerLock = g_canvas.requestPointerLock || g_canvas.mozRequestPointerLock || g_canvas.webkitRequestPointerLock;
    document.exitPointerLock    = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
    document.addEventListener( "pointerlockchange", PointerLockChangeCallback, false );
    document.addEventListener( "mozpointerlockchange", PointerLockChangeCallback, false );
    document.addEventListener( "webkitpointerlockchange", PointerLockChangeCallback, false );

    // make the meshes
    var sphereMesh          = GenerateSphereMesh( 20, 20 ) ;
    var cubeMesh            = GenerateCubeMesh() ;
    var tetrahedronMesh     = GenerateTetrahedronMesh() ;

    // make the uniform definitions for the shaders
    g_uniformsShaderSource  = "// uniform constants\n";
    for ( var key in g_uniforms )
    {
        g_uniformsShaderSource +=
            "uniform " + g_uniforms[key][0] + " " + key + ";\n";
    }
    //console.log( 'uniform constants : ' );
    //console.log( g_uniformsShaderSource );

    // make each shader permutation
    var permuteCount        = GetNumShaderPermutations();
    console.log( "Permute Count : " + permuteCount ) ;
    for ( var i = 0 ; i < GetNumShaderPermutations() ; ++i ) 
    {
        // make permutation specific defines
        var permutationSource = GetShaderPermutationSourceString( i );
        //console.log( '// permutation string : \n' + permutationSource );

        // make the shader
        var shader          = MakeShader( vertexShaderSource, fragmentShaderSource, permutationSource );

        // make the sphere mesh buffers
        shader.sphereMeshVertCount = sphereMesh.pos.length;

        shader.sphereMesh   = gl.createVertexArray();
        gl.bindVertexArray( shader.sphereMesh );

        MakeMeshBuffers( sphereMesh, shader.program );

        // make the cube mesh buffers
        shader.cubeMeshVertCount = cubeMesh.pos.length;
        shader.cubeMesh = gl.createVertexArray();
        gl.bindVertexArray( shader.cubeMesh );

        MakeMeshBuffers( cubeMesh, shader.program );

        // make the tetrahedron mesh buffers
        shader.tetrahedronMeshVertCount = tetrahedronMesh.pos.length;
        shader.tetrahedronMesh = gl.createVertexArray();
        gl.bindVertexArray( shader.tetrahedronMesh );

        MakeMeshBuffers( tetrahedronMesh, shader.program );

        g_shaders[i] = shader;
    }

    // make the skybox shader
    {
        // make the shader
        var shader = MakeShader( skyboxVertexShaderSource, skyboxFragmentShaderSource, "" );

        // make the cube mesh buffers
        shader.cubeMeshVertCount = cubeMesh.pos.length;
        shader.cubeMesh     = gl.createVertexArray();
        gl.bindVertexArray(shader.cubeMesh);

        MakeMeshBuffers( cubeMesh, shader.program );

        g_skyboxShader  = shader;
    }

    // calculate initial camera matrix
    UpdateCameraMatrix();

    // load the images and then start rendering
    LoadImagesAndRender();
}

window.onload       = Initialize;
window.onkeydown    = OnKeyDown;
window.onkeyup      = OnKeyUp;

// const canvas        = document.getElementById('RenderWindow');
// if ( canvas )
// {
//     canvas.onclick  = OnRenderWindowClick;
// }

