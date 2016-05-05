var canvas = null;
var _gl = null;

var shader = null;
var camera = null;

var stats = null;

window.requestAnimFrame =
window.requestAnimationFrame       ||
window.webkitRequestAnimationFrame ||
window.mozRequestAnimationFrame    ||
window.oRequestAnimationFrame      ||
window.msRequestAnimationFrame     ||
function(callback) {
    window.setTimeout(callback, 1000 / 60);
};

window.onload = function(e) {
	initStats();
	initCanvas();
	initGL();
	initFun();
};

function initStats() {
	stats = new Stats();
	stats.setMode( 1 );
	document.body.appendChild( stats.domElement );
	stats.domElement.style.cssText = "position: fixed; top: 0px; left: 0px;";
}

function initCanvas() {
	canvas = document.createElement('canvas');
	canvas.width = 465;
	canvas.height = 465;
	document.body.appendChild(canvas);
}

function initGL() {
	try {
        _gl = canvas.getContext("experimental-webgl");
        _gl.canvas = canvas;
    } catch (e) {
    }
    if (!_gl) {
        alert("Oops! No webgl? Buy a MacbookPro!");
    }
}

function initFun() {
	if(_gl) {
		// ignore fatal
		js.poly2tri.fatal = (function(){});

		var loads = [
			['shadow', 'shadow512.png'],
			['A', 'Ace-of-Heart-Big.png'],
			['page', 'page-e1.png'],
			['face', 'face2.png'],
			['background', 'texture.png'],
			['test', 'test-texture.png']
		];
		var images = {};
		function loadImages(func) {
			if(loads.length > 0) {
				var load = loads.shift();
				var img = new Image();
				img.onload = function(e) {
					var imgtex = new ImageTexture(_gl);
					images[load[0]] = imgtex;
					imgtex.setValue(img, {flipY: false}); // flip or not based on Y axis, default is true
					loadImages(func);
				};
				img.src = "images/"+load[1];
			} else {
				func();
			}
		}
		loadImages(function() {
			g.clear();

			// test draw
			g.beginFill([1.0, 0.0, 0.0]);
				g.moveTo(50, 50);
				g.lineTo(50, 100);
				g.lineTo(100, 100);
				g.lineTo(100, 50);
			g.end();

			g.beginFill([0.0, 0.0, 1.0], 0.6);
				g.drawRect(25, 25, 50, 50);
			g.end();

			g.beginFillImage(images['face']);
				g.drawRect(100, 100, 50, 50);
			g.end();

			g.beginFillImage(images['face']);
				g.drawCircle(250, 100, 50, 50);
			g.end();

			// faster draw, but beginFill + drawRect faster if draw multiple times
			// g.drawImage(img, 25, 25, 462, 462);

			// comment below to test
			initPlay();
		});

		var g = new Graphic(_gl);
		g.clearColor(0.9,0.9,0.9,1.0);
		//g.setSize(512,512);

		var mouses = [];
		var count = 0;

		function initPlay() {
			var dragging = false;
			var evtTarget = window;
			var useCapture = true;

			window.s_mousedown = function( e ) {
				e.preventDefault();
				if( !e ) { e = window.event; }
				if(!dragging) {
					dragging = true;
					mouses = [{x: e.pageX, y: e.pageY}];
				}
			};
			evtTarget.addEventListener( "mousedown", window.s_mousedown, useCapture );
			window.s_mousemove = function( e ) {
				e.preventDefault();
				if( !e ) { e = window.event; }
				if(dragging) {
					// don't push if current pos is identical with last one
					var i = mouses.length - 1;
					if(e.pageX != mouses[i].x && e.pageY != mouses[i].y)
						mouses.push({x: e.pageX, y: e.pageY});
				}
			};
			evtTarget.addEventListener( "mousemove", window.s_mousemove, useCapture );
			window.s_mouseup = function( e ) {
				e.preventDefault();
				if(dragging) {
					dragging = false;
				}
			};
			evtTarget.addEventListener( "mouseup", window.s_mouseup, useCapture );

// codes and messages from kotsoft - https://twitter.com/kotsoft
			// I apologize for some of the shittiest code ever. I tried to make this for js1k but failed
			var size = canvas.width; // canvas size, used by both width and height
			var b = document.body;
//			var c = document.body.getElementsByTagName('canvas')[0];
//			c.width = c.height = size;
//			var a = c.getContext('2d');
			document.body.clientWidth; // fix bug in webkit: http://qfox.nl/weblog/218

// original value on right
			blobs = {};
			max = 20;
			nb = 1; // 1
			np = 20; // 20
			r = 10; // 10
			inc = 2*Math.PI/np; // 2*Math.PI/np
			bound = 70, // 50
			gas = 5000; // 1000
			sf = 0.25; // 0.25
			gravity = 0.03; // 0.01

			for (i = 0; i < nb; i++) {
			    blob = blobs[i] = [];
			    blob.cx = cx = Math.random()*size;
			    blob.cy = cy = Math.random()*size;
			    for (j = 0; j < np; j++) {
			        p = blob[j] = {};
			        p.xp = p.x = cx+r*Math.cos(j*inc);
			        p.yp = p.y = cy+r*Math.sin(j*inc);
			        p.dx = p.dy = p.nx = p.ny = 0;
			    }
			}
// begin
//			setInterval(function() {
			var useP2T = true;
			function update() {
//				requestAnimFrame(update);
				stats.begin(); // ++

// +++
				g.clear();


				// drawImage is faster if drawing different image
				g.drawImage(images['background'], 25, 25, canvas.width - 50, canvas.height - 50, 1.0);

//				g.beginFillImage(background, 1.0);
//				g.drawRect(25, 25, 462, 462);
//				g.end();


				g.beginFillImage(images['face'], 0.6, useP2T);
// +++
//*
// kotsoft area -- keep out
			    if (nb < max && Math.random()<.01) {
			        blob = blobs[nb++] = [];
			        blob.cx = cx = Math.random()*size;
			        blob.cy = cy = Math.random()*size;
			        for (j = 0; j < np; j++) {
			            p = blob[j] = {};
			            p.xp = p.x = cx+r*Math.cos(j*inc);
			            p.yp = p.y = cy+r*Math.sin(j*inc);
			            p.dx = p.dy = p.nx = p.ny = 0;
			        }
			    }
//				a.clearRect(0,0,c.width,c.height);
//				a.beginPath();

				for (i = 0; i < nb; i++) {
				    blob = blobs[i];
				    for (j=i+1;j<nb;j++) {
				        coll = blobs[j];
				        vx = coll.cx-blob.cx;
				        if (vx > -bound && vx < bound) {
				            vy = coll.cy-blob.cy;
				            if (vy > -bound && vy < bound) {
				                len = Math.sqrt(vx*vx+vy*vy);
				                dx = vx/len;
				                dy = vy/len;
				                for (k=0;k<np;k++) {
				                    p1 = blob[k];
				                    p2 = coll[k];
				                    
				                    dp = Math.max(0, (p1.x-blob.cx)*dx+(p1.y-blob.cy)*dy-len/2);
				                    p1.x -= dp*dx;
				                    p1.y -= dp*dy;
				                    dp = Math.min(0, (p2.x-coll.cx)*dx+(p2.y-coll.cy)*dy+len/2);
				                    p2.x -= dp*dx;
				                    p2.y -= dp*dy;
				                }
				            }
				        }
				    }
				}
				for (i = 0; i < nb; i++) {
				    blob = blobs[i];
//g.beginFill([1,0,0]);
//g.beginFillImage(images['face'], 0.6);
				    for (j = 0; j < np; j++) {
				        p = blob[j];
				        q = blob[(j+1)%np];
				        vx = q.x-p.x;
				        vy = q.y-p.y;
				        p.dx += vx*sf;
				        p.dy += vy*sf;
				        p.nx += vy;
				        p.ny -= vx;
				        q.dx -= vx*sf;
				        q.dy -= vy*sf;
				        q.nx += vy;
				        q.ny -= vx;
//			        	a.moveTo(p.x,p.y);a.lineTo(q.x,q.y)
// +++
						if(j == 0)
							g.moveTo(p.x, p.y);
						else
							g.lineTo(p.x, p.y);
// +++
				    }
//g.end();				    
				    qa = 0;
				    qb = 0;
				    qc = 0;
				    
				    for (j = 0; j < np; j++) {
				        p = blob[j];
				        q = blob[(j+1)%np];
				        qa += p.nx*q.ny-q.nx*p.ny;
				        qb += p.x*q.ny+p.nx*q.y-q.x*p.ny-q.nx*p.y;
				        qc += (p.x+p.dx)*(q.y+q.dy)-(q.x+q.dx)*(p.y+p.dy);
				    }
				    
				    h = (Math.sqrt(qb*qb-4*qa*(qc-gas))-qb)/2/qa;
				    
				    
				    
				    blob.cx = blob.cy = 0;
				    for (j = 0; j < np; j++) {
				        p = blob[j];
				        p.x += p.dx+h*p.nx;
				        p.y += p.dy+h*p.ny;
				        p.dx = p.dy = p.nx = p.ny = 0;
				        u = p.x-p.xp;
				        v = p.y-p.yp+gravity;
				        p.xp = p.x;
				        p.yp = p.y;
				        p.x += u;
				        p.y += v;
				        if (p.y < 0) p.y = 0; else if (p.y > size) p.y = size;
				        if (p.x < 0) p.x = 0; else if (p.x > size) p.x = size;
				        blob.cx += p.x;
				        blob.cy += p.y;
				    }
				    blob.cx /= np;
				    blob.cy /= np;
				}
// kotsoft area -- keep out
//*/

//				a.stroke();
// +++
				// test draw
				g.drawCircle(200, 50, 25);
				g.drawRect(50, 50, 50, 50);
				g.drawRect(100, 100, 100, 50);

				g.end();


				var offset = 50;
				var rsize = canvas.width - offset * 2;

				// find the center position of the rect
				var center = offset + rsize / 2;

				g.pushMatrix();

					// transformation should always apply before begin
					// move to center
					g.translate([center, center, 0]);
					g.rotate(count);

					// move to 0,0
					g.translate([-center, -center, 0]);

					// or just
					// g.rotateCenter(center, center, count);

					g.beginFill([0.0, 0.0, 1.0], 0.3);
						g.drawRect(offset, offset, rsize, rsize);
					g.end();

					g.pushMatrix();

						var red_offset = 350;
						var red_rsize = 50;
						var red_center = red_offset + red_rsize / 2;

						// rotate slightly faster
						g.rotateCenter(red_center, red_center, -count * 1.5);

						// g.beginFill([1.0, 0.0, 0.0], 0.8);
						// draw next sprite after each 60 frames
						g.beginFillImageSprite(images['test'], 0.8, 8, 8, Math.round(count / (60)) % 16);
							g.drawRect(red_offset, red_offset, red_rsize, red_rsize);
						g.end();

					g.popMatrix();

					g.pushMatrix();

						g.rotateCenter(300, 350, -count * 2.5);

						g.beginFillImage(images['face'], 0.8);
							g.drawCircle(300, 350, 50);
						g.end();

					g.popMatrix();

				g.popMatrix();

				draw();

				count++;
// +++
				stats.end(); // ++

// end
//				}, 16);
				setTimeout(update, 8);
			}
			setTimeout(update, 8);
//			update();

			function draw() {
				if(mouses.length<3) return;
//				g.clear();
//				g.beginFill([0.0, 0.0, 0.0], 0.8, true);
				g.beginFillImage(images['face'], 0.7, true);
				for(var i = 0; i < mouses.length; i++)
					if(i == 0)
						g.moveTo(mouses[i].x, mouses[i].y);
					else
						g.lineTo(mouses[i].x, mouses[i].y);
				g.end();
			}
		}
	}
}