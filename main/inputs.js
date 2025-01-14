var isMouseLDown = false;
var isMouseRDown = false;
var previousX;
var previousY;


function initInputs()
{
    canvas.addEventListener( "mousemove", getCoords );
    canvas.addEventListener( "mousedown", mouseDown );
    canvas.addEventListener( "mouseup", mouseUp );
    canvas.addEventListener( "mousewheel", mouseWheelHandler, false );

    canvas.addEventListener( "dblclick", function () { screenfull.toggle() }, false );
    screenfull.on( 'change', () => { handleFullscreenChange(); } );

    document.addEventListener( "keydown", keyboardHandler );
    canvas.addEventListener( 'contextmenu', function ( e ) { e.preventDefault(); }, false );

    // Firefox...
    canvas.addEventListener( "DOMMouseScroll", mouseWheelHandler, false );
}

/**
 * 
 * @param {MouseEvent} e 
 * @returns 
 */
function getCoords( e )
{
    // No buttons pressed
    if ( e.buttons == 0 )
    {
        return;
    }

    var x   = e.clientX;
    var y   = e.clientY;
    var dX  = previousX - x;
    var dY  = previousY - y;

    if ( isMouseLDown ) // 왼쪽버튼
    {
        camera.rotateByMouse( dX, dY );
    } 
    else if ( isMouseRDown ) // 오른쪽버튼
    {
        camera.translateByMouse( dX, dY );
    }

    previousX = x;
    previousY = y;
}

/**
 * 
 * @param {MouseEvent} e 
 */
function mouseDown( e )
{
    switch ( e.button )
    {
        case 0:
            isMouseLDown = true;
            break;
        case 2:
            isMouseRDown = true;
            break;
    }

    previousX = e.clientX;
    previousY = e.clientY;
}

/**
 * 
 * @param {MouseEvent} e 
 */
function mouseUp( e )
{
    switch ( e.button )
    {
        case 0:
            isMouseLDown = false;
            break;
        case 2:
            isMouseRDown = false;
            break;
    }
}

/**
 * 마우스 이벤트 핸들러
 * @param {WheelEvent} e 
 */
function mouseWheelHandler( e )
{
    var delta = Math.max( -1, Math.min( 1, ( e.wheelDelta || -e.detail ) ) );
    camera.zoom( -delta );

    skybox.proj = makePerspective( camera.fovAngle, canvas.clientWidth / canvas.clientHeight, 1.0, camera.farPlane );
}

/**
 * 키보드 이벤트 핸들러
 * @param {KeyboardEvent} e 
 * @returns 
 */
function keyboardHandler( e ) 
{
    switch ( e.keyCode )
    {
        case 82:
            autoRotation.isRotating = !autoRotation.isRotating;
            break;
        case 87:
            if ( scene.mode == gl.TRIANGLES )
            {
                scene.mode = gl.LINES;
                guiObj.sceneMode = "Wireframe" ;
            } 
            else
            {
                scene.mode = gl.TRIANGLES;
                guiObj.sceneMode = "Normal" ;
            }
            break;
        case 107:
            camera.zoom( -1.0 );
            break;
        case 109:
            camera.zoom( 1.0 );
            break;
        case 123:
            console.log( "Hey there, welcome to the console :)" );
            break;
        default:
            console.log( "You pressed: " + e.keyCode + " , " + e.code );
            break;
    }

    return false;
}

/**
 * 전체화면 모드 전환
 */
function handleFullscreenChange()
{
    // Do not select anythin or you won't be able to move the camera
    window.getSelection().removeAllRanges();

    // Change canvas size and style
    if ( screenfull.isFullscreen )
    {
        canvas.width                = window.innerWidth ;
        canvas.height               = window.innerHeight ;
        canvas.style.borderWidth    = "0px" ;
    }
    else
    {
        canvas.width                = 960 ;
        canvas.height               = 480 ;
        canvas.style.borderWidth    = "1px" ;
    }

    // Update aspect ratio of projection matrix
    pMatrix     = makePerspective( camera.fovAngle, canvas.width / canvas.height, camera.nearPlane, camera.farPlane );
    skybox.proj = makePerspective( camera.fovAngle, canvas.width / canvas.height, 1.0, camera.farPlane );
}