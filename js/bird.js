/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
/*global THREE, console */

// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
// supported.
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe

THREE.OrbitControls = function ( object, domElement ) {

	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API

	// Set to false to disable this control
	this.enabled = true;

	// "target" sets the location of focus, where the control orbits around
	// and where it pans with respect to.
	this.target = new THREE.Vector3();

	// center is old, deprecated; use "target" instead
	this.center = this.target;

	// This option actually enables dollying in and out; left as "zoom" for
	// backwards compatibility
	this.noZoom = false;
	this.zoomSpeed = 1.0;

	// Limits to how far you can dolly in and out ( PerspectiveCamera only )
	this.minDistance = 0;
	this.maxDistance = Infinity;

	// Limits to how far you can zoom in and out ( OrthographicCamera only )
	this.minZoom = 0;
	this.maxZoom = Infinity;

	// Set to true to disable this control
	this.noRotate = false;
	this.rotateSpeed = 1.0;

	// Set to true to disable this control
	this.noPan = false;
	this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

	// Set to true to automatically rotate around the target
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	// How far you can orbit horizontally, upper and lower limits.
	// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
	this.minAzimuthAngle = - Infinity; // radians
	this.maxAzimuthAngle = Infinity; // radians

	// Set to true to disable use of the keys
	this.noKeys = false;

	// The four arrow keys
	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

	// Mouse buttons
	this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

	////////////
	// internals

	var scope = this;

	var EPS = 0.000001;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();
	var panOffset = new THREE.Vector3();

	var offset = new THREE.Vector3();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	var theta;
	var phi;
	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;
	var pan = new THREE.Vector3();

	var lastPosition = new THREE.Vector3();
	var lastQuaternion = new THREE.Quaternion();

	var STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

	var state = STATE.NONE;

	// for reset

	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();
	this.zoom0 = this.object.zoom;

	// so camera.up is the orbit axis

	var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
	var quatInverse = quat.clone().inverse();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start' };
	var endEvent = { type: 'end' };

	this.rotateLeft = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		thetaDelta -= angle;

	};

	this.rotateUp = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		phiDelta -= angle;

	};

	// pass in distance in world space to move left
	this.panLeft = function ( distance ) {

		var te = this.object.matrix.elements;

		// get X column of matrix
		panOffset.set( te[ 0 ], te[ 1 ], te[ 2 ] );
		panOffset.multiplyScalar( - distance );

		pan.add( panOffset );

	};

	// pass in distance in world space to move up
	this.panUp = function ( distance ) {

		var te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set( te[ 4 ], te[ 5 ], te[ 6 ] );
		panOffset.multiplyScalar( distance );

		pan.add( panOffset );

	};

	// pass in x,y of change desired in pixel space,
	// right and down are positive
	this.pan = function ( deltaX, deltaY ) {

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( scope.object instanceof THREE.PerspectiveCamera ) {

			// perspective
			var position = scope.object.position;
			var offset = position.clone().sub( scope.target );
			var targetDistance = offset.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			scope.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
			scope.panUp( 2 * deltaY * targetDistance / element.clientHeight );

		} else if ( scope.object instanceof THREE.OrthographicCamera ) {

			// orthographic
			scope.panLeft( deltaX * (scope.object.right - scope.object.left) / element.clientWidth );
			scope.panUp( deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight );

		} else {

			// camera neither orthographic or perspective
			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );

		}

	};

	this.dollyIn = function ( dollyScale ) {

		if ( dollyScale === undefined ) {

			dollyScale = getZoomScale();

		}

		if ( scope.object instanceof THREE.PerspectiveCamera ) {

			scale /= dollyScale;

		} else if ( scope.object instanceof THREE.OrthographicCamera ) {

			scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom * dollyScale ) );
			scope.object.updateProjectionMatrix();
			scope.dispatchEvent( changeEvent );

		} else {

			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

		}

	};

	this.dollyOut = function ( dollyScale ) {

		if ( dollyScale === undefined ) {

			dollyScale = getZoomScale();

		}

		if ( scope.object instanceof THREE.PerspectiveCamera ) {

			scale *= dollyScale;

		} else if ( scope.object instanceof THREE.OrthographicCamera ) {

			scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom / dollyScale ) );
			scope.object.updateProjectionMatrix();
			scope.dispatchEvent( changeEvent );

		} else {

			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

		}

	};

	this.update = function () {

		var position = this.object.position;

		offset.copy( position ).sub( this.target );

		// rotate offset to "y-axis-is-up" space
		offset.applyQuaternion( quat );

		// angle from z-axis around y-axis

		theta = Math.atan2( offset.x, offset.z );

		// angle from y-axis

		phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

		if ( this.autoRotate && state === STATE.NONE ) {

			this.rotateLeft( getAutoRotationAngle() );

		}

		theta += thetaDelta;
		phi += phiDelta;

		// restrict theta to be between desired limits
		theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, theta ) );

		// restrict phi to be between desired limits
		phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

		// restrict phi to be betwee EPS and PI-EPS
		phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

		var radius = offset.length() * scale;

		// restrict radius to be between desired limits
		radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

		// move target to panned location
		this.target.add( pan );

		offset.x = radius * Math.sin( phi ) * Math.sin( theta );
		offset.y = radius * Math.cos( phi );
		offset.z = radius * Math.sin( phi ) * Math.cos( theta );

		// rotate offset back to "camera-up-vector-is-up" space
		offset.applyQuaternion( quatInverse );

		position.copy( this.target ).add( offset );

		this.object.lookAt( this.target );

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;
		pan.set( 0, 0, 0 );

		// update condition is:
		// min(camera displacement, camera rotation in radians)^2 > EPS
		// using small-angle approximation cos(x/2) = 1 - x^2 / 8

		if ( lastPosition.distanceToSquared( this.object.position ) > EPS
		    || 8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS ) {

			this.dispatchEvent( changeEvent );

			lastPosition.copy( this.object.position );
			lastQuaternion.copy (this.object.quaternion );

		}

	};


	this.reset = function () {

		state = STATE.NONE;

		this.target.copy( this.target0 );
		this.object.position.copy( this.position0 );
		this.object.zoom = this.zoom0;

		this.object.updateProjectionMatrix();
		this.dispatchEvent( changeEvent );

		this.update();

	};

	this.getPolarAngle = function () {

		return phi;

	};

	this.getAzimuthalAngle = function () {

		return theta

	};

	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

	}

	function getZoomScale() {

		return Math.pow( 0.95, scope.zoomSpeed );

	}

	function onMouseDown( event ) {

		if ( scope.enabled === false ) return;
		event.preventDefault();

		if ( event.button === scope.mouseButtons.ORBIT ) {
			if ( scope.noRotate === true ) return;

			state = STATE.ROTATE;

			rotateStart.set( event.clientX, event.clientY );

		} else if ( event.button === scope.mouseButtons.ZOOM ) {
			if ( scope.noZoom === true ) return;

			state = STATE.DOLLY;

			dollyStart.set( event.clientX, event.clientY );

		} else if ( event.button === scope.mouseButtons.PAN ) {
			if ( scope.noPan === true ) return;

			state = STATE.PAN;

			panStart.set( event.clientX, event.clientY );

		}

		if ( state !== STATE.NONE ) {
			document.addEventListener( 'mousemove', onMouseMove, false );
			document.addEventListener( 'mouseup', onMouseUp, false );
			scope.dispatchEvent( startEvent );
		}

	}

	function onMouseMove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( state === STATE.ROTATE ) {

			if ( scope.noRotate === true ) return;

			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			// rotating across whole screen goes 360 degrees around
			scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

		} else if ( state === STATE.DOLLY ) {

			if ( scope.noZoom === true ) return;

			dollyEnd.set( event.clientX, event.clientY );
			dollyDelta.subVectors( dollyEnd, dollyStart );

			if ( dollyDelta.y > 0 ) {

				scope.dollyIn();

			} else if ( dollyDelta.y < 0 ) {

				scope.dollyOut();

			}

			dollyStart.copy( dollyEnd );

		} else if ( state === STATE.PAN ) {

			if ( scope.noPan === true ) return;

			panEnd.set( event.clientX, event.clientY );
			panDelta.subVectors( panEnd, panStart );

			scope.pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );

		}

		if ( state !== STATE.NONE ) scope.update();

	}

	function onMouseUp( /* event */ ) {

		if ( scope.enabled === false ) return;

		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

	}

	function onMouseWheel( event ) {

		if ( scope.enabled === false || scope.noZoom === true || state !== STATE.NONE ) return;

		event.preventDefault();
		event.stopPropagation();

		var delta = 0;

		if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9

			delta = event.wheelDelta;

		} else if ( event.detail !== undefined ) { // Firefox

			delta = - event.detail;

		}

		if ( delta > 0 ) {

			scope.dollyOut();

		} else if ( delta < 0 ) {

			scope.dollyIn();

		}

		scope.update();
		scope.dispatchEvent( startEvent );
		scope.dispatchEvent( endEvent );

	}

	function onKeyDown( event ) {

		if ( scope.enabled === false || scope.noKeys === true || scope.noPan === true ) return;

		switch ( event.keyCode ) {

			case scope.keys.UP:
				scope.pan( 0, scope.keyPanSpeed );
				scope.update();
				break;

			case scope.keys.BOTTOM:
				scope.pan( 0, - scope.keyPanSpeed );
				scope.update();
				break;

			case scope.keys.LEFT:
				scope.pan( scope.keyPanSpeed, 0 );
				scope.update();
				break;

			case scope.keys.RIGHT:
				scope.pan( - scope.keyPanSpeed, 0 );
				scope.update();
				break;

		}

	}

	function touchstart( event ) {

		if ( scope.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:	// one-fingered touch: rotate

				if ( scope.noRotate === true ) return;

				state = STATE.TOUCH_ROTATE;

				rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			case 2:	// two-fingered touch: dolly

				if ( scope.noZoom === true ) return;

				state = STATE.TOUCH_DOLLY;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );
				dollyStart.set( 0, distance );
				break;

			case 3: // three-fingered touch: pan

				if ( scope.noPan === true ) return;

				state = STATE.TOUCH_PAN;

				panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			default:

				state = STATE.NONE;

		}

		if ( state !== STATE.NONE ) scope.dispatchEvent( startEvent );

	}

	function touchmove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		switch ( event.touches.length ) {

			case 1: // one-fingered touch: rotate

				if ( scope.noRotate === true ) return;
				if ( state !== STATE.TOUCH_ROTATE ) return;

				rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				rotateDelta.subVectors( rotateEnd, rotateStart );

				// rotating across whole screen goes 360 degrees around
				scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
				// rotating up and down along whole screen attempts to go 360, but limited to 180
				scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

				rotateStart.copy( rotateEnd );

				scope.update();
				break;

			case 2: // two-fingered touch: dolly

				if ( scope.noZoom === true ) return;
				if ( state !== STATE.TOUCH_DOLLY ) return;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );

				dollyEnd.set( 0, distance );
				dollyDelta.subVectors( dollyEnd, dollyStart );

				if ( dollyDelta.y > 0 ) {

					scope.dollyOut();

				} else if ( dollyDelta.y < 0 ) {

					scope.dollyIn();

				}

				dollyStart.copy( dollyEnd );

				scope.update();
				break;

			case 3: // three-fingered touch: pan

				if ( scope.noPan === true ) return;
				if ( state !== STATE.TOUCH_PAN ) return;

				panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				panDelta.subVectors( panEnd, panStart );

				scope.pan( panDelta.x, panDelta.y );

				panStart.copy( panEnd );

				scope.update();
				break;

			default:

				state = STATE.NONE;

		}

	}

	function touchend( /* event */ ) {

		if ( scope.enabled === false ) return;

		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

	this.domElement.addEventListener( 'touchstart', touchstart, false );
	this.domElement.addEventListener( 'touchend', touchend, false );
	this.domElement.addEventListener( 'touchmove', touchmove, false );

	window.addEventListener( 'keydown', onKeyDown, false );

	// force an update at start
	this.update();

};

THREE.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;





//THREEJS RELATED VARIABLES 

var scene, 
    camera,
    controls,
    fieldOfView,
  	aspectRatio,
  	nearPlane,
  	farPlane,
    shadowLight, 
    backLight,
    light, 
    renderer,
		container;

//SCENE
var floor, brid1, bird2;

//SCREEN VARIABLES

var HEIGHT,
  	WIDTH,
    windowHalfX,
  	windowHalfY,
    mousePos = {x:0,y:0};


//INIT THREE JS, SCREEN AND MOUSE EVENTS

function init(){
  scene = new THREE.Scene();
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  aspectRatio = WIDTH / HEIGHT;
  fieldOfView = 60;
  nearPlane = 1;
  farPlane = 2000; 
  camera = new THREE.PerspectiveCamera(
    fieldOfView,
    aspectRatio,
    nearPlane,
    farPlane);
  camera.position.z = 1000;  
  camera.position.y = 300;
  camera.lookAt(new THREE.Vector3(0,0,0));    
  renderer = new THREE.WebGLRenderer({alpha: true, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio); 
  renderer.setSize(WIDTH, HEIGHT);
  renderer.shadowMapEnabled = true;
  
  container = document.getElementById('world');
  container.appendChild(renderer.domElement);

  windowHalfX = WIDTH / 2;
  windowHalfY = HEIGHT / 2;
    
  window.addEventListener('resize', onWindowResize, false);
  document.addEventListener('mousemove', handleMouseMove, false);
  document.addEventListener('touchstart', handleTouchStart, false);
	document.addEventListener('touchend', handleTouchEnd, false);
	document.addEventListener('touchmove',handleTouchMove, false);
  /*
  controls = new THREE.OrbitControls( camera, renderer.domElement);
  //*/
}

function onWindowResize() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  windowHalfX = WIDTH / 2;
  windowHalfY = HEIGHT / 2;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
}

function handleMouseMove(event) {
  mousePos = {x:event.clientX, y:event.clientY};
}

function handleTouchStart(event) {
  if (event.touches.length > 1) {
    event.preventDefault();
		mousePos = {x:event.touches[0].pageX, y:event.touches[0].pageY};
  }
}

function handleTouchEnd(event) {
    mousePos = {x:windowHalfX, y:windowHalfY};
}

function handleTouchMove(event) {
  if (event.touches.length == 1) {
    event.preventDefault();
		mousePos = {x:event.touches[0].pageX, y:event.touches[0].pageY};
  }
}

function createLights() {
  light = new THREE.HemisphereLight(0xffffff, 0xffffff, .5)
  
  shadowLight = new THREE.DirectionalLight(0xffffff, .8);
  shadowLight.position.set(200, 200, 200);
  shadowLight.castShadow = true;
  shadowLight.shadowDarkness = .2;
 	
  backLight = new THREE.DirectionalLight(0xffffff, .4);
  backLight.position.set(-100, 200, 50);
  backLight.shadowDarkness = .1;
  backLight.castShadow = true;
 	
  scene.add(backLight);
  scene.add(light);
  scene.add(shadowLight);
}

//BIRD

Bird = function(){
  
  this.rSegments = 4;
  this.hSegments = 3;
  this.cylRay = 120;
  this.bodyBirdInitPositions = [];
  this.vAngle = this.hAngle = 0;
  this.normalSkin = {r:255/255, g:222/255, b:121/255};
  this.shySkin = {r:255/255, g:222/255, b:121/255};
  this.color = {r:this.normalSkin.r, g:this.normalSkin.g, b:this.normalSkin.b};
  this.side = "left";
  
  this.shyAngles = {h:0, v:0};
  this.behaviourInterval;
  this.intervalRunning = false;
  
  this.threegroup = new THREE.Group();
  
  // materials
  this.yellowMat = new THREE.MeshLambertMaterial ({
    color: 0xFFFF00, 
    shading:THREE.FlatShading
  });
  this.whiteMat = new THREE.MeshLambertMaterial ({
    color: 0xFFFFFF,
    shading: THREE.FlatShading
  });
  this.blackMat = new THREE.MeshLambertMaterial ({
    color: 0x000000,
    shading: THREE.FlatShading
  });
  this.orangeMat = new THREE.MeshLambertMaterial ({
    color: 0xFF6347,
    shading: THREE.FlatShading
  });
  
  //WINGS
  
  this.wingLeftGroup = new THREE.Group();
  this.wingRightGroup = new THREE.Group();
 
  var wingGeom = new THREE.BoxGeometry(50,50,5);
  var wingLeft = new THREE.Mesh(wingGeom, this.yellowMat);
  this.wingLeftGroup.add(wingLeft);
  this.wingLeftGroup.position.x = 70;
  this.wingLeftGroup.position.z = 0;
  this.wingLeftGroup.rotation.y = Math.PI/2;
  wingLeft.rotation.x = -Math.PI/4;
  var wingRight = new THREE.Mesh(wingGeom, this.yellowMat);
  this.wingRightGroup.add(wingRight);
  this.wingRightGroup.position.x = -70;
  this.wingRightGroup.position.z = 0;
  this.wingRightGroup.rotation.y = -Math.PI/2;
  wingRight.rotation.x = -Math.PI/4;
  
  //BODY
  
  var bodyGeom = new THREE.CylinderGeometry(40, 70, 200, this.rSegments, this.hSegments);
  this.bodyBird = new THREE.Mesh(bodyGeom, this.yellowMat);
  this.bodyBird.position.y = 70;
  
  this.bodyVerticesLength = (this.rSegments+1)*(this.hSegments);
  for (var i=0;i<this.bodyVerticesLength; i++){
    var tv = this.bodyBird.geometry.vertices[i];
    this.bodyBirdInitPositions.push({x:tv.x, y:tv.y, z:tv.z});
  }
  
  this.threegroup.add(this.bodyBird);
  this.threegroup.add(this.wingLeftGroup);
  this.threegroup.add(this.wingRightGroup);
  
  
  // EYES
  
  this.face = new THREE.Group();
  var eyeGeom = new THREE.BoxGeometry(55,55,10);
  var irisGeom = new THREE.BoxGeometry(10,10,10);
  
  this.leftEye = new THREE.Mesh(eyeGeom, this.whiteMat);
  this.leftEye.position.x = -30;
  this.leftEye.position.y = 120;
  this.leftEye.position.z = 35;
  this.leftEye.rotation.y = -Math.PI/4;
  
  this.leftIris = new THREE.Mesh(irisGeom, this.blackMat);
  this.leftIris.position.x = -30;
  this.leftIris.position.y = 120;
  this.leftIris.position.z = 40;
  this.leftIris.rotation.y = -Math.PI/4;
  
  
  this.rightEye = new THREE.Mesh(eyeGeom, this.whiteMat);
  this.rightEye.position.x = 30;
  this.rightEye.position.y = 120;
  this.rightEye.position.z = 35;
  this.rightEye.rotation.y = Math.PI/4;
  
  this.rightIris = new THREE.Mesh(irisGeom, this.blackMat);
  this.rightIris.position.x = 30;
  this.rightIris.position.y = 120;
  this.rightIris.position.z = 40;
  this.rightIris.rotation.y = Math.PI/4;
  
  // BEAK
  
  var beakGeom = new THREE.CylinderGeometry(0,20,20, 4,1);
  this.beak = new THREE.Mesh(beakGeom, this.orangeMat);
  this.beak.position.z = 65;
  this.beak.position.y = 70;
  this.beak.rotation.x = Math.PI/2;
  
  this.face.add(this.rightEye);
  this.face.add(this.rightIris);
  this.face.add(this.leftEye);
  this.face.add(this.leftIris);
  this.face.add(this.beak);
  
  //FEATHERS
  
  var featherGeom = new THREE.BoxGeometry(5,20,5);
  this.feather1 = new THREE.Mesh(featherGeom, this.yellowMat);
  this.feather1.position.z = 55;
  this.feather1.position.y = 185;
  this.feather1.rotation.x = Math.PI/4;
  this.feather1.scale.set(1.5,1.5,1);
  
  this.feather2 = new THREE.Mesh(featherGeom, this.yellowMat);
  this.feather2.position.z = 50;
  this.feather2.position.y = 180;
  this.feather2.position.x = 20;
  this.feather2.rotation.x = Math.PI/4;
  this.feather2.rotation.z = -Math.PI/8;
    
  this.feather3 = new THREE.Mesh(featherGeom, this.yellowMat);
  this.feather3.position.z = 50;
  this.feather3.position.y = 180;
  this.feather3.position.x = -20;
  this.feather3.rotation.x = Math.PI/4;
  this.feather3.rotation.z = Math.PI/8;
  
  this.face.add(this.feather1);
  this.face.add(this.feather2);
  this.face.add(this.feather3);
  this.threegroup.add(this.face);
  
  this.threegroup.traverse( function ( object ) {
		if ( object instanceof THREE.Mesh ) {
			object.castShadow = true;
			object.receiveShadow = true;
		}
	} );
  
}

Bird.prototype.look = function(hAngle,vAngle){
  this.hAngle = hAngle;
  this.vAngle = vAngle;
  
  this.leftIris.position.y = 120 - this.vAngle*30;
  this.leftIris.position.x = -30 + this.hAngle*10;
  this.leftIris.position.z = 40 + this.hAngle*10;
  
  this.rightIris.position.y = 120 - this.vAngle*30;
  this.rightIris.position.x = 30 + this.hAngle*10;
  this.rightIris.position.z = 40 - this.hAngle*10;
  
  this.leftEye.position.y = this.rightEye.position.y = 120 - this.vAngle*10;
  
  this.beak.position.y = 70 - this.vAngle*20;
  this.beak.rotation.x = Math.PI/2 + this.vAngle/3;
  
  this.feather1.rotation.x = (Math.PI/4) + (this.vAngle/2);
  this.feather1.position.y = 185 - this.vAngle*10;
  this.feather1.position.z = 55 + this.vAngle*10;
  
  this.feather2.rotation.x = (Math.PI/4) + (this.vAngle/2);
  this.feather2.position.y = 180 - this.vAngle*10;
  this.feather2.position.z = 50 + this.vAngle*10;
  
  this.feather3.rotation.x = (Math.PI/4) + (this.vAngle/2);
  this.feather3.position.y = 180 - this.vAngle*10;
  this.feather3.position.z = 50 + this.vAngle*10;
  
  
  for (var i=0;i<this.bodyVerticesLength; i++){
    var line = Math.floor(i/(this.rSegments+1));
    var tv = this.bodyBird.geometry.vertices[i];
    var tvInitPos = this.bodyBirdInitPositions[i];
    var a, dy;
    if (line >= this.hSegments-1){
      a = 0;
    }else{
      a = this.hAngle/(line+1); 
    }
    var tx = tvInitPos.x*Math.cos(a) + tvInitPos.z*Math.sin(a);
    var tz = -tvInitPos.x*Math.sin(a) + tvInitPos.z*Math.cos(a);
    tv.x = tx;
    tv.z = tz;
  }
  this.face.rotation.y = this.hAngle;
  this.bodyBird.geometry.verticesNeedUpdate = true;
  
}
Bird.prototype.lookAway = function(fastMove){
  var speed = fastMove? .4 : 2;
  var ease = fastMove? Strong.easeOut : Strong.easeInOut;
  var delay = fastMove? .2 : 0;
  var col = fastMove? this.shySkin : this.normalSkin;
  var tv = (-1 + Math.random()*2) * Math.PI/3;
  var beakScaleX = .75 + Math.random()*.25;
  var beakScaleZ = .5 + Math.random()*.5;
  
  if (this.side == "right"){
    var th = (-1 + Math.random()) * Math.PI/4;  
  }else{
    var th = Math.random() * Math.PI/4; 
  }  
  _this = this;
  TweenMax.killTweensOf(this.shyAngles);
  TweenMax.to(this.shyAngles, speed, {v:tv, h:th, ease:ease, delay:delay});
  TweenMax.to (this.color, speed, {r:col.r, g:col.g, b:col.b, ease:ease, delay:delay});
  TweenMax.to(this.beak.scale, speed, {z:beakScaleZ, x:beakScaleX, ease:ease, delay:delay});
      
}

Bird.prototype.stare = function(){
  _this = this;
  var col = this.normalSkin;
  if (this.side == "right"){
    var th = Math.PI/3;  
  }else{
    var th = -Math.PI/3;
  }  
  TweenMax.to(this.shyAngles, 2, {v:-.5, h:th, ease:Strong.easeInOut});
  TweenMax.to (this.color, 2, {r:col.r, g:col.g, b:col.b, ease:Strong.easeInOut});
  TweenMax.to(this.beak.scale, 2, {z:.8, x:1.5, ease:Strong.easeInOut});
 
}

 //*   
function createFloor(){ 
  floor = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000,1000), new THREE.MeshBasicMaterial({color: 0xffffff}));
  floor.rotation.x = -Math.PI/2;
  floor.position.y = -33;
  floor.receiveShadow = true;
  scene.add(floor);
}

function createBirds(){
  bird1 = new Bird();
  bird1.threegroup.position.x = 0;
  scene.add(bird1.threegroup);
  
  bird2 = new Bird();
  bird2.threegroup.position.x = -250;
  bird2.side = "right";
  bird2.threegroup.scale.set(.8,.8,.8);
  bird2.threegroup.position.y = -8;
  scene.add(bird1.threegroup);
  
  bird3 = new Bird();
  bird3.threegroup.position.x = 250;
  bird3.side = "left";
  bird3.threegroup.scale.set(.8,.8,.8);
  bird3.threegroup.position.y = -8;
  scene.add(bird1.threegroup);
}


function loop(){
  var tempHA = (mousePos.x-windowHalfX)/200;
  var tempVA = (mousePos.y - windowHalfY)/200;
  var userHAngle = Math.min(Math.max(tempHA, -Math.PI/3), Math.PI/3);
  var userVAngle = Math.min(Math.max(tempVA, -Math.PI/3), Math.PI/3);
  bird1.look(userHAngle,userVAngle);
  
  if (bird1.hAngle < -Math.PI/5 && !bird2.intervalRunning){
      bird2.lookAway(true);
      bird2.intervalRunning = true;
      bird2.behaviourInterval = setInterval(function(){
        bird2.lookAway(false);
      }, 1500);
  }else if (bird1.hAngle > 0 && bird2.intervalRunning){
    bird2.stare();
    clearInterval(bird2.behaviourInterval);
    bird2.intervalRunning = false;

  }else if (bird1.hAngle > Math.PI/5 && !bird3.intervalRunning){
    bird3.lookAway(true);
    bird3.intervalRunning = true;
    bird3.behaviourInterval = setInterval(function(){
      bird3.lookAway(false);
    }, 1500);
  }else if (bird1.hAngle < 0 && bird3.intervalRunning){
    bird3.stare();
    clearInterval(bird3.behaviourInterval);
    bird3.intervalRunning = false;
  }
  
  bird2.look(bird2.shyAngles.h, bird2.shyAngles.v);
  bird2.bodyBird.material.color.setRGB(bird2.color.r,bird2.color.g,bird2.color.b);
  
  bird3.look(bird3.shyAngles.h, bird3.shyAngles.v);
  bird3.bodyBird.material.color.setRGB(bird3.color.r,bird3.color.g,bird3.color.b);
  
  render();
  requestAnimationFrame(loop);
}

function render(){
  //controls.update();
  renderer.render(scene, camera);
}


init();
createLights();
createFloor();
createBirds();
loop();

