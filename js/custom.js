(function () {
    var myDiv = document.getElementById("world"),
        show = function () {
            myDiv.style.display = "block";
            setTimeout(hide, 8000);
        },
        hide = function () {
            myDiv.style.display = "none";
        };
    show();
})();

$(document).ready(function () {
    setTimeout(function () {
        $("#mainPage").show();
    }, 8000);
});

$(window).on("scroll", function () {
    if ($(window).scrollTop() > 50) {
        $(".header").addClass("activeHeader");
    } else {
        $(".header").removeClass("activeHeader");
    }
});
$(window).on("scroll", function () {
    if ($(window).scrollTop() > 50) {
        $(".logoContainer").addClass("logoContainerBlock");
    } else {
        $(".logoContainer").removeClass("logoContainerBlock");
    }
});
$(window).on("scroll", function () {
    if ($(window).scrollTop() > 50) {
        $(".jusEnd").addClass("jusBetween");
    } else {
        $(".jusEnd").removeClass("jusBetween");
    }
});





// ------ 


( function( $ ) {
    "use strict";
    
        $( function() {
            
            var MainStage = function() {
    
    
                var $window                   = $( window ),
                    windowWidth               = window.innerWidth,
                    windowHeight              = window.innerHeight,
                    rendererCanvasID          = '3D-particle-effect-canvas';
    
                var renderer, 
                    texture, 
                    scene, 
                    camera,
                    particles,
                    imagedata,
                    clock        = new THREE.Clock(),
                    mouseX       = 0, 
                    mouseY       = 0,
                    isMouseDown  = true,
                    lastMousePos = {x: 0, y: 0},
                    windowHalfX  = windowWidth / 2,
                    windowHalfY  = windowHeight / 2;
    
    
    
    
                //particle rotation
                var particleRotation;
    
                var centerVector = new THREE.Vector3(0, 0, 0);
                var previousTime = 0;
    
    
    
                function init() {
    
                    //@https://github.com/mrdoob/three.js/blob/dev/src/extras/ImageUtils.js#L21
                    THREE.ImageUtils.crossOrigin = '';
    
                    //WebGL Renderer		
                    renderer = new THREE.WebGLRenderer( { 
                                            canvas   : document.getElementById( rendererCanvasID ), //canvas
                                            alpha    : true, 
                                            antialias: true 
                                        } );
    
    
                    renderer.setSize(windowWidth, windowHeight);
    
    
    
    
                    //Scene
                    scene = new THREE.Scene();
    
                    //camera
                    camera = new THREE.PerspectiveCamera(50, windowWidth / windowHeight, 0.1, 10000);
                    camera.position.set(-100, 0, 600);
                    camera.lookAt( centerVector );
                    scene.add( camera );
    
    
                    // instantiate a loader
                    var loader = new THREE.TextureLoader();
    
                    // load a resource
                    loader.load(
                        // resource URL
                        'data:image/png;base64,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',
    
                        // onLoad callback
                        function ( texture ) {
                            // in this example we create the material when the texture is loaded
                            // Get data from an image
                            imagedata = getImageData( texture.image );
    
                            // Immediately use the texture for material creation
                            var geometry = new THREE.Geometry();
                            var material = new THREE.PointsMaterial({
                                size: 3,
                                color: 0xffffff,
                                sizeAttenuation: false
                            });
    
    
    
                            for (var y = 0, y2 = imagedata.height; y < y2; y += 2) {
    
                                for (var x = 0, x2 = imagedata.width; x < x2; x += 2) {
    
                                    if ( imagedata.data[(x * 4 + y * 4 * imagedata.width) + 3] > 128 ) {
    
    
                                        // The array of vertices holds the position of every vertex in the model.
                                        var vertex = new THREE.Vector3();
    
    
                                        vertex.x = Math.random() * 1000;
                                        vertex.y = Math.random() * 1000;
                                        vertex.z = -Math.random() * 1000;
    
                                        vertex.destination = {
                                            x: x - imagedata.width / 21,
                                            y: -y + imagedata.height / 21,
                                            z: 0
                                        };
    
                                        vertex.speed = Math.random() / 200 + 0.015;
    
                                        geometry.vertices.push( vertex );
    
    
                                    }
                                }
                            }
                            particles = new THREE.Points( geometry, material );
    
                            scene.add( particles );
    
    
    
    
                        },
    
                        // onProgress callback currently not supported
                        undefined,
    
                        // onError callback
                        function ( err ) {
                            console.error( 'An error happened.' );
                        }
                    );
    
    
    
                    // add particle rotation
                    particleRotation = new THREE.Object3D();
                    scene.add( particleRotation );
                    var geometryPR = new THREE.TetrahedronGeometry(6, 0),
                        materialPR = new THREE.MeshPhongMaterial({
                        color: 0x000000,
                        flatShading: THREE.FlatShading
                    });
    
                    for (var i = 0; i < 50; i++) {
                        var mesh = new THREE.Mesh( geometryPR, materialPR );
                        mesh.position.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
                        mesh.position.multiplyScalar(100 + (Math.random() * 1500));
                        mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
                        particleRotation.add(mesh);
                    }
    
                    var ambientLight = new THREE.AmbientLight(0xFFD500 );
                    scene.add(ambientLight);
    
                    var lights = [];
                    lights[0] = new THREE.DirectionalLight( 0xFFD500, 1 );
                    lights[0].position.set( 1, 0, 0 );
                    lights[1] = new THREE.DirectionalLight( 0xFFD500, 1 );
                    lights[1].position.set( 0.75, 1, 0.5 );
                    lights[2] = new THREE.DirectionalLight( 0x000000, 1 );
                    lights[2].position.set( -0.75, -1, 0.5 );
                    scene.add( lights[0] );
                    scene.add( lights[1] );
                    scene.add( lights[2] );
    
    
    
    
                    //----
                    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
                    document.addEventListener( 'touchstart', onDocumentTouchStart, false );
                    document.addEventListener( 'touchmove', onDocumentTouchMove, false );
    
                    document.addEventListener( 'mousedown', onDocumentMouseDown, false );
                    document.addEventListener( 'mouseup', onDocumentMouseUp, false );
    
    
    
                    // Fires when the window changes
                    window.addEventListener( 'resize', onWindowResize, false );	
                }
    
    
    
    
    
                function render() {
                    requestAnimationFrame( render );
    
                    var delta      = clock.getDelta(),
                        thickness = 40;
    
    
                    //Need to add judgment to avoid Cannot read property 'geometry' of undefined
                    if ( typeof particles != typeof undefined ) {
    
                        for (var i = 0, j = particles.geometry.vertices.length; i < j; i++) {
                            var particle = particles.geometry.vertices[i];
                            particle.x += (particle.destination.x - particle.x) * particle.speed;
                            particle.y += (particle.destination.y - particle.y) * particle.speed;
                            particle.z += (particle.destination.z - particle.z) * particle.speed;
                        }
    
    
                        if ( delta - previousTime > thickness ) {
                            var index     = Math.floor(Math.random()*particles.geometry.vertices.length);
                            var particle1 = particles.geometry.vertices[index];
                            var particle2 = particles.geometry.vertices[particles.geometry.vertices.length-index];
    
                            TweenMax.to( particle, Math.random()*2+1, {
                                            x:    particle2.x, 
                                            y:    particle2.y, 
                                            ease: Power2.easeInOut
                                        });
    
    
    
                            TweenMax.to( particle2, Math.random()*2+1, {
                                            x:    particle1.x, 
                                            y:    particle1.y, 
                                            ease: Power2.easeInOut
                                        });
    
                            previousTime = delta;
                        }
    
    
                        particles.geometry.verticesNeedUpdate = true;	
                    }
    
    
                    if( ! isMouseDown ) {
                        camera.position.x += (0-camera.position.x)*1000.01;
                        camera.position.y += (0-camera.position.y)*1000.01;
                    }
    
    
                    camera.position.x += ( mouseX - camera.position.x ) * 0.01;
                    camera.position.y += ( - mouseY - camera.position.y ) * 0.01;
                    camera.lookAt( centerVector );
    
    
                    //particle rotation
                    // particleRotation.rotation.x += 0.0000;
                    // particleRotation.rotation.y -= 0.0040;
    
    
                    renderer.render( scene, camera );
    
                }
    
    
    
                function onWindowResize() {
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                    renderer.setSize( window.innerWidth, window.innerHeight );
                }
    
    
                function onDocumentMouseMove( event ) {
    
                    mouseX = event.clientX - windowHalfX;
                    mouseY = event.clientY - windowHalfY;
    
                    if( isMouseDown ) {
                        camera.position.x += (event.clientX-lastMousePos.x)/50;
                        camera.position.y -= (event.clientY-lastMousePos.y)/50;
                        camera.lookAt( centerVector );
                        lastMousePos = {x: event.clientX, y: event.clientY};
                    }
    
    
                }
    
    
                function onDocumentTouchStart( event ) {
    
                    if ( event.touches.length == 1 ) {
    
                        event.preventDefault();
    
                        mouseX = event.touches[ 0 ].pageX - windowHalfX;
                        mouseY = event.touches[ 0 ].pageY - windowHalfY;
                    }
                }
    
                function onDocumentTouchMove( event ) {
    
                    if ( event.touches.length == 1 ) {
    
                        event.preventDefault();
    
                        mouseX = event.touches[ 0 ].pageX - windowHalfX;
                        mouseY = event.touches[ 0 ].pageY - windowHalfY;
    
                    }
                }
    
    
                function onDocumentMouseUp() {
                    isMouseDown = false;
                }
    
                function onDocumentMouseDown( event ) {
                    isMouseDown = true;
                    lastMousePos = {x: event.clientX, y: event.clientY};
    
    
                }
                function getImageData( image ) {
    
                    var canvas = document.createElement( 'canvas' );
                    canvas.width = image.width;
                    canvas.height = image.height;
    
                    var ctx = canvas.getContext( '2d' );
                    ctx.drawImage(image, 0, 0);
    
                    return ctx.getImageData(0, 0, image.width, image.height);
                }
    
                return {
                    init      : init,
                    render    : render,
                    getScene  : function () { return scene; },
                    getCamera : function () { return camera; } 
                };
    
    
            }();
    
            MainStage.init();
            MainStage.render();
            
    
    
        } );
        
        
    } ) ( jQuery );