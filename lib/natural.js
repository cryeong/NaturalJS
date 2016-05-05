(function(window) {
	if(!window.Natural) window.Natural = {};
}(window));
(function(window) {
	Natural.exposeNature = function(where) {
		if(!where) return;
		where.Shader = Natural.Shader;
		where.Utils = Natural.Utils;
		where.Graphic = Natural.Graphic;
		where.ImageTexture = Natural.ImageTexture;
		where.Camera = Natural.Camera;
		where.CameraControl = Natural.CameraControl;
		where.VFactory = Natural.VFactory;
		where.VPackage = Natural.VPackage;
		where.RenderTexture = Natural.RenderTexture;
	};
}(window));
// Shader
(function(window) {
	var Shader = function(gl, vs, fs) {
		this.gl = gl;
		if(typeof(vs) == 'object')
			this.compile(vs.vs || vs.vertex, vs.fs || vs.fragment);
		else
			this.compile(vs, fs);
	};
	Shader.prototype = {
		compile: function(vs, fs) {
			var gl = this.gl;

			// fragment
			this.frag = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(this.frag, fs);
			gl.compileShader(this.frag);
			if (!gl.getShaderParameter(this.frag, gl.COMPILE_STATUS)) {
				console.log(gl.getShaderInfoLog(this.frag));
				return null;
			}

			// vertex
			this.vert = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(this.vert, vs);
			gl.compileShader(this.vert);
			if (!gl.getShaderParameter(this.vert, gl.COMPILE_STATUS)) {
				console.log(gl.getShaderInfoLog(this.vert));
				return null;
			}

			// program
			var program = gl.createProgram();
			gl.attachShader(program, this.frag);
			gl.attachShader(program, this.vert);
			gl.linkProgram(program);
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				console.log("Could not initialise shaders");
			}

			gl.deleteShader(this.vert);
			gl.deleteShader(this.frag);

			if(this.program) gl.deleteProgram(this.program);

			this.program = program;

			// extract
			this.uniforms = this.extractUniforms();
			this.attributes = this.extractAttributes();
		},
		extractUniforms: function() {
			var gl = this.gl;
			if(gl.unitCount === undefined) gl.unitCount = 0;
			var uniforms = {};
			gl.useProgram(this.program);
			var uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
			for (var u = 0; u < uniformCount; u++) {
				var info = gl.getActiveUniform(this.program, u);
				var location = gl.getUniformLocation(this.program, info.name);
				if (info.type == gl.SAMPLER_2D) {
					uniforms[info.name] = new Natural.UniformTexture(gl, gl.unitCount++, location, this);
				} else
					uniforms[info.name] = new Natural.Uniform(gl, info.type, location);
			}
			return uniforms;
		},
		extractAttributes: function() {
			var gl = this.gl;
			var attributes = {};
			gl.useProgram(this.program);
			var attributeCount = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
			for (var a = 0; a < attributeCount; a++) {
				var info = gl.getActiveAttrib(this.program, a);
				var location = gl.getAttribLocation(this.program, info.name);
				attributes[info.name] = new Natural.Attribute(gl, info.type, location);
			}
			return attributes;
		},
		updateUniform: function (name, value, opts) {
			var uniform = this.uniforms[name];
			if (!uniform && console) {
				console.warn("Invalid uniform name " + name);
				return;
			}
			this.gl.useProgram(this.program);

			uniform.setValue(value);
		},
		updateAttribute: function (name, value, stride, offset) {
			if(typeof(stride) == 'undefined') stride = 0;
			if(typeof(offset) == 'undefined') offset = 0;
			var attribute = this.attributes[name];
			if (!attribute && console) {
				console.warn("Invalid attribute name " + name);
				return;
			}
			this.gl.useProgram(this.program);
			attribute.setValue(value, stride, offset);
		},
		updateIndice: function(value) {
			var gl = this.gl;
			if(!this.indexBuffer) {
				this.indexBuffer = gl.createBuffer();
			}
			if(value) this.indices = value;
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        	if(value) gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
		},
		explain: function() {
			var ex = "//////uniforms\n";
			for(var prop in this.uniforms) ex += prop + "\n";
			ex+="//////attributes\n";
			for(prop in this.attributes) ex += prop + "\n";
			return ex;
		},
		getDrawType: function(type) {
			var choice = this.gl.TRIANGLE_STRIP; // default
			if(typeof(type) != 'undefined')
				switch(type.toLowerCase()) {
					case 'triangles':
						choice = this.gl.TRIANGLES;
						break;
					case 'trianglestrip':
						break;
					case 'trianglefan':
						choice = this.gl.TRIANGLE_FAN;
						break;
					case 'lines':
						choice = this.gl.LINES;
						break;
					case 'linestrip':
						choice = this.gl.LINE_STRIP;
						break;
					case 'lineloop':
						choice = this.gl.LINE_LOOP;
						break;
					case 'points':
						choice = this.gl.POINTS;
						break;
					case 'pointstrip':
						choice = this.gl.POINT_STRIP;
						break;
					case 'quads':
						choice = this.gl.QUADS;
						break;
					case 'quadstrip':
						choice = this.gl.QUAD_STRIP;
						break;
					case 'polygon':
						choice = this.gl.POLYGON;
						break;
					case 'polygonbit':
						choice = this.gl.POLYGON_BIT;
						break;
					case 'polygobstipplebit':
						choice = this.gl.POLYGON_STIPPLE_BIT;
						break;
				}
			return choice;
		},
		drawArray: function(count, type) {
			if(typeof(type) == 'undefined') type = 'triangles';
			this.gl.drawArrays(this.getDrawType(type), 0, count);
		},
		drawElement: function(value, type) {
			// deprecated
			this.updateIndice(value);
			this.drawElements(type);
		},
		drawElements: function(type) {
			if(typeof(type) == 'undefined') type = 'triangles';
			this.gl.drawElements(this.getDrawType(type), this.indices.length, this.gl.UNSIGNED_SHORT, 0);
		},
		uploadAttributes: function() {
			// deprecated
		},
		bind: function() {
			this.currentProgram = this.gl.getParameter(this.gl.CURRENT_PROGRAM);
			this.gl.useProgram(this.program);
		},
		unbind: function() {
			var gl = this.gl;

			for(var prop in this.attributes) {
				attribute = this.attributes[prop];
				gl.disableVertexAttribArray(attribute.attributeLocation);
			}
			gl.useProgram((this.currentProgram)?this.currentProgram:null);
		}
	};
	window.Natural.Shader = Shader;
}(window));
// Utils
(function(window) {
	var Utils = {};
	var u = Utils;
	u.ShaderScript = {
		Point2d : {
			vertex: "attribute vec2 aV2Position;\n\
uniform float uF1PointSize;\n\
uniform mat4 uM4Projection;\n\
void main(void) {\n\
gl_PointSize = uF1PointSize;\n\
gl_Position = uM4Projection * vec4(aV2Position, 1.0, 1.0);\n\
}",
			fragment: "#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
uniform vec4 uV4Color;\n\
void main(void) {\n\
gl_FragColor = uV4Color;\n\
}"
		},
		Point3d : {
			vertex: "attribute vec3 aV3Position;\n\
uniform float uF1PointSize;\n\
uniform mat4 uM4Projection;\n\
void main(void) {\n\
gl_PointSize = uF1PointSize;\n\
gl_Position = uM4Projection * vec4(aV3Position, 1.0);\n\
}",
			fragment: "#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
uniform vec4 uV4Color;\n\
void main(void) {\n\
gl_FragColor = uV4Color;\n\
}"
		},
		Color2d: {
			vertex: "attribute vec2 aV2Position;\n\
uniform mat4 uM4Projection;\n\
uniform mat4 uM4CameraTransform;\n\
uniform mat4 uM4Transform;\n\
void main(void) {\n\
gl_Position = uM4Projection * uM4CameraTransform * uM4Transform * vec4(aV2Position, 0.0, 1.0);\n\
}",
			fragment: "#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
uniform vec4 uV4Color;\n\
void main(void) {\n\
gl_FragColor = uV4Color;\n\
}"
		},
		Color3d: {
			vertex: "attribute vec3 aV3Position;\n\
uniform mat4 uM4Projection;\n\
uniform mat4 uM4CameraTransform;\n\
uniform mat4 uM4Transform;\n\
void main(void) {\n\
gl_Position =  uM4Projection * uM4CameraTransform * uM4Transform * vec4(aV3Position, 1.0);\n\
}",
			fragment: "#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
uniform vec4 uV4Color;\n\
void main(void) {\n\
gl_FragColor = uV4Color;\n\
}"
		},
		Texture2d: {
			vertex: "attribute vec2 aV2Position;\n\
attribute vec2 aV2Texcoord;\n\
uniform mat4 uM4Projection;\n\
uniform mat4 uM4CameraTransform;\n\
uniform mat4 uM4Transform;\n\
varying vec2 vV2Texcoord;\n\
\n\
void main(void) {\n\
	vV2Texcoord = aV2Texcoord;\n\
	gl_Position = uM4Projection * uM4CameraTransform * uM4Transform * vec4(aV2Position, 0.0, 1.0);\n\
}",
			fragment: "#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
\n\
uniform sampler2D uS2Texture;\n\
varying vec2 vV2Texcoord;\n\
\n\
void main(void) {\n\
gl_FragColor = texture2D(uS2Texture, vV2Texcoord);\n\
}"
		},
		Texture3d: {
			vertex: "attribute vec3 aV3Position;\n\
attribute vec2 aV2Texcoord;\n\
uniform mat4 uM4Projection;\n\
uniform mat4 uM4CameraTransform;\n\
uniform mat4 uM4Transform;\n\
varying vec2 vV2Texcoord;\n\
\n\
void main(void) {\n\
	vV2Texcoord = aV2Texcoord;\n\
	gl_Position = uM4Projection * uM4CameraTransform * uM4Transform * vec4(aV3Position, 1.0);\n\
}",
			fragment: "#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
\n\
uniform sampler2D uS2Texture;\n\
varying vec2 vV2Texcoord;\n\
\n\
void main(void) {\n\
gl_FragColor = texture2D(uS2Texture, vV2Texcoord);\n\
}"
		},
		Mirror3d: {
			vertex: "attribute vec3 aV3Position;\n\
uniform mat4 uM4Projection;\n\
uniform mat4 uM4CameraTransform;\n\
uniform mat4 uM4Transform;\n\
uniform vec2 vsize;\n\
varying vec2 vV2Texcoord;\n\
\n\
void main(void) {\n\
	gl_Position = uM4Projection * uM4CameraTransform * uM4Transform * vec4(aV3Position, 1.0);\n\
	vec4 v = gl_Position;\n\
	v.x /= glPosition.w;\n\
	v.y /= glPosition.w;\n\
	float vx = vsize.x * ((v.x + 1.0) / 2.0);\n\
	float vy = vsize.y * (1.0 - ((v.y + 1.0) / 2.0));\n\
	vV2Texcoord = vec2(vx, vy);\n\
}",
			fragment: "#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
\n\
uniform sampler2D uS2Texture;\n\
varying vec2 vV2Texcoord;\n\
\n\
void main(void) {\n\
gl_FragColor = texture2D(uS2Texture, vV2Texcoord);\n\
}"
		}
	};
	u.convert3to2 = function(v4, camera, extra) {
		var v = vec4.clone(v4);

		var m = camera.mvp();
		if(typeof(extra) != 'undefined')
			mat4.mul(m, m, extra);

		vec4.transformMat4(v, v, m);
		
		v[0] /= v[3];
		v[1] /= v[3];
		//p_vec3.z /= p_vec3.w;
		
		// now, z is for z-fighting, w is focal length factor
		var _x = camera.view.width * ((v[0] + 1.0) / 2.0);
		var _y = camera.view.height * (1.0 - ((v[1] + 1.0) / 2.0));
		
		return [_x, _y, v[2], v[3]];
	};
	// depth is any z
	u.convert2to3 = function(x, y, depth, camera, extra) {
		// prepare matrix
		var m = camera.mvp();
		if(typeof(extra) != 'undefined')
			mat4.mul(m, m, extra);
		mat4.invert(m, m);
		
		// prepare vertex
		var v = vec4.fromValues(x, y, depth, 1)

		v[0] = (v[0] - camera.view.x) / camera.view.width;
		v[1] = (v[1] - camera.view.y) / camera.view.height;

		v[0] = v[0] * 2.0 - 1.0;
		v[1] = v[1] * 2.0 - 1.0;
		
		var dz = (((
			(m[2]  - depth * m[3] ) * v[0] +
			(m[6]  - depth * m[7] ) * v[1] +
			(m[14] - depth * m[15]) * 1.0
			) / (depth * m[11] - m[10])) + 1) / 2.0;

		v[2] = dz;
		v[2] = v[2] * 2.0 - 1.0;

		// transform
		vec4.transformMat4(v, v, m);

		v[0] /= v[3];
		v[1] /= -v[3];
		v[2] /= v[3];

		return v;
	};
	// glM4 -> new Float32Array / Array
	u.matrix2quat = function(glM4) {
		var q = {x: 0.0, y: 0.0, z: 0.0, w: 0.0};

		// steal from threejs, Quaternion.js
		// see http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
		var te = glM4,

			m11 = te[0], m12 = te[4], m13 = te[8],
			m21 = te[1], m22 = te[5], m23 = te[9],
			m31 = te[2], m32 = te[6], m33 = te[10],

			trace = m11 + m22 + m33,
			s;

		if ( trace > 0 ) {

			s = 0.5 / Math.sqrt( trace + 1.0 );

			q.w = 0.25 / s;
			q.x = ( m32 - m23 ) * s;
			q.y = ( m13 - m31 ) * s;
			q.z = ( m21 - m12 ) * s;

		} else if ( m11 > m22 && m11 > m33 ) {

			s = 2.0 * Math.sqrt( 1.0 + m11 - m22 - m33 );

			q.w = (m32 - m23 ) / s;
			q.x = 0.25 * s;
			q.y = (m12 + m21 ) / s;
			q.z = (m13 + m31 ) / s;

		} else if ( m22 > m33 ) {

			s = 2.0 * Math.sqrt( 1.0 + m22 - m11 - m33 );

			q.w = (m13 - m31 ) / s;
			q.x = (m12 + m21 ) / s;
			q.y = 0.25 * s;
			q.z = (m23 + m32 ) / s;

		} else {

			s = 2.0 * Math.sqrt( 1.0 + m33 - m11 - m22 );

			q.w = ( m21 - m12 ) / s;
			q.x = ( m13 + m31 ) / s;
			q.y = ( m23 + m32 ) / s;
			q.z = 0.25 * s;

		}

		return q;
	};
	u.quat2matrix = function(q) {
		var m4 = mat4.create();
		var x = q.x, y = q.y, z = q.z, w = q.w;
		var x2 = x + x, y2 = y + y, z2 = z + z;
		var xx = x * x2, xy = x * y2, xz = x * z2;
		var yy = y * y2, yz = y * z2, zz = z * z2;
		var wx = w * x2, wy = w * y2, wz = w * z2;

		m4[0] = 1 - ( yy + zz );
		m4[4] = xy - wz;
		m4[8] = xz + wy;

		m4[1] = xy + wz;
		m4[5] = 1 - ( xx + zz );
		m4[9] = yz - wx;

		m4[2] = xz - wy;
		m4[6] = yz + wx;
		m4[10] = 1 - ( xx + yy );

		return m4;
	};
	u.decomposeMat4 = function(m4) {

		// still steal from threejs, Matrix4.js
		var data = {
			position: {x: 0, y: 0, z: 0},
			quaternion: {x: 0, y: 0, z: 0, w: 1},
			scale: {x: 0, y: 0, z: 0}
		};

		var ax = {x: 0, y: 0, z: 0};
		var ay = {x: 0, y: 0, z: 0};
		var az = {x: 0, y: 0, z: 0};

		var te = m4;

		// grab the axis vectors
		ax.x = te[0];
		ax.y = te[1];
		ax.z = te[2];

		ay.x = te[4];
		ay.y = te[5];
		ay.z = te[6];

		az.x = te[8];
		az.y = te[9];
		az.z = te[10];

		// get scale
		data.scale.x = Math.sqrt(ax.x*ax.x+ax.y*ax.y+ax.z*ax.z);
		data.scale.y = Math.sqrt(ay.x*ay.x+ay.y*ay.y+ay.z*ay.z);
		data.scale.z = Math.sqrt(az.x*az.x+az.y*az.y+az.z*az.z);

		data.position.x = te[12];
		data.position.y = te[13];
		data.position.z = te[14];

		// extract the rotation part
		var mt4 = mat4.clone(m4);

		mt4[0] /= data.scale.x;
		mt4[1] /= data.scale.x;
		mt4[2] /= data.scale.x;

		mt4[4] /= data.scale.y;
		mt4[5] /= data.scale.y;
		mt4[6] /= data.scale.y;

		mt4[8] /= data.scale.z;
		mt4[9] /= data.scale.z;
		mt4[10] /= data.scale.z;

		data.quaternion = u.matrix2quat( mt4 );

		return data;
	};
	u.composeMat4 = function(data) {
		var rot = u.quat2matrix(data.quaternion);
		var sm = mat4.create();
		mat4.scale(sm, sm, [data.scale.x, data.scale.y, data.scale.z]);
		mat4.multiply(rot, rot, sm);

		rot[12] = data.position.x;
		rot[13] = data.position.y;
		rot[14] = data.position.z;

		return rot;
	};
	u.mat4interpolation = function(m4A, m4B, percent) {
		// steal from wonderfl
		// see http://wonderfl.net/c/3LuF

		var v0 = u.decomposeMat4(m4A);
		var v1 = u.decomposeMat4(m4B);
		var cosOmega = v0.quaternion.w*v1.quaternion.w + v0.quaternion.x*v1.quaternion.x + v0.quaternion.y*v1.quaternion.y + v0.quaternion.z*v1.quaternion.z;
		if(cosOmega < 0){
			v1.quaternion.x = -v1.quaternion.x;
			v1.quaternion.y = -v1.quaternion.y;
			v1.quaternion.z = -v1.quaternion.z;
			v1.quaternion.w = -v1.quaternion.w;
			cosOmega = -cosOmega;
		}
		var k0;
		var k1;
		if(cosOmega > 0.9999){
			k0 = 1 - percent;
			k1 = percent;
		}else{
			var sinOmega = Math.sqrt(1 - cosOmega*cosOmega);
			var omega = Math.atan2(sinOmega,cosOmega);
			var oneOverSinOmega = 1/sinOmega;
			k0 = Math.sin((1-percent)*omega)*oneOverSinOmega;
			k1 = Math.sin(percent*omega)*oneOverSinOmega;
		}
		var scale_x = v0.scale.x*(1-percent) + v1.scale.x*percent;
		var scale_y = v0.scale.y*(1-percent) + v1.scale.y*percent;
		var scale_z = v0.scale.z*(1-percent) + v1.scale.z*percent;
		
		var tx = v0.position.x*(1-percent) + v1.position.x*percent;
		var ty = v0.position.y*(1-percent) + v1.position.y*percent;
		var tz = v0.position.z*(1-percent) + v1.position.z*percent;

		var x = v0.quaternion.x*k0+v1.quaternion.x*k1;
		var y = v0.quaternion.y*k0+v1.quaternion.y*k1;
		var z = v0.quaternion.z*k0+v1.quaternion.z*k1;
		var w = v0.quaternion.w*k0+v1.quaternion.w*k1;
/*
		var _q = mat4.create();//[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
		_q[0] = (1-2*y*y-2*z*z);//*scale_x;
		_q[1] = (2*x*y+2*w*z);//*scale_x;
		_q[2] = (2*x*z-2*w*y);//*scale_x;
		_q[3] = 0;
		_q[4] = 2*x*y-2*w*z;//*scale_y;
		_q[5] = (1-2*x*x-2*z*z);//*scale_y;
		_q[6] = 2*y*z+2*w*x;//*scale_y;
		_q[7] = 0;
		_q[8] = 2*x*z+2*w*y;//*scale_z;
		_q[9] = 2*y*z-2*w*x;//*scale_z;
		_q[10] = (1-2*x*x-2*y*y);//*scale_z;
		_q[11] = 0;
		_q[12] = tx;
		_q[13] = ty;
		_q[14] = tz;
		_q[15] = 1;

		var sm = mat4.create();
		mat4.scale(sm, sm, [scale_x, scale_y, scale_z]);

		mat4.multiply(_q, _q, sm);
		
		return _q;//mat4.clone(_q);
//*/
		var data = {
			position: {x: tx, y: ty, z: tz},
			quaternion: {x: x, y: y, z: z, w: w},
			scale: {x: scale_x, y: scale_y, z: scale_z}
		};

		return u.composeMat4(data);
	};
	window.Natural.Utils = Utils;
}(window));
// Image Loader
(function(window) {
	var ImageLoader = function(opts) {
		if(typeof(opts) == 'undefined') opts = {};

		this.images = {};
		this.urls = [];

		if(opts.urls) {
			this.loadImages(opts);
		}
	};
	ImageLoader.prototype = {
		loadImages: function(opts) {
			if(typeof(opts) == 'undefined') opts = {};

			this.gl = opts.gl;
			this.urls = opts.urls;

			if(this.gl && this.urls)
				this.loadImage();
			else
				console.log('gl or url not present..');

			this.completeCallback = opts.complete;
		},
		loadImage: function() {
			var self = this;
			if(this.urls.length > 0) {
				var url = this.urls.shift();
				var img = new Image();
				img.onload = function(e) {
					var imgtex = new Natural.ImageTexture(self.gl);
					self.images[url] = imgtex;
					imgtex.setValue(img);
					self.loadImage();
				};
				img.src = url;
			} else {
				this.complete();
			}
		},
		complete: function() {
			if(this.completeCallback) {
				this.completeCallback();
			}
		}
	};
	window.Natural.ImageLoader = ImageLoader;
}(window));
// Dot
(function(window) {
	var Dot = function(px, py) {
		px = typeof(px) != 'undefined' ? px : 0;
		py = typeof(py) != 'undefined' ? py : 0;
		this.init(px, py);
	};
	Dot.prototype = {
		x: 0,
		y: 0,
		init: function(px, py) {
			this.x = px;
			this.y = py;
		},
		clone: function() {
			return new Dot(this.x, this.y);
		},
		copy: function() {
			if(arguments.length > 1) {
				this.x = arguments[0] || 0;
				this.y = arguments[1] || 0;
			} else {
				var arg0 = arguments[0];
				if(arg0 instanceof Dot) {
					this.x = arg0.x;
					this.y = arg0.y;
				} else {
					this.x = arg0;
				}
			}
			return this;
		},
		buildWithAngleR: function( R, angle ) {
			this.x = R * Math.cos( angle );
			this.y = R * Math.sin( angle );
			return this;
		},
		length: function() {
			return Math.sqrt(this.x*this.x+this.y*this.y);
		},
		add: function(p) {
			if(!this.check(p)) return;
			this.x += p.x;
			this.y += p.y;
			return this;
		},
		add_r: function(p) {
			if(!this.check(p)) return;
			return new Dot(this.x + p.x, this.y + p.y);
		},
		sub: function(p) {
			if(!this.check(p)) return;
			this.x -= p.x;
			this.y -= p.y;
			return this;
		},
		sub_r: function(p) {
			if(!this.check(p)) return;
			return new Dot(this.x - p.x, this.y - p.y);
		},
		normalize: function(mag) {
			mag = typeof(mag) != 'undefined' ? mag : 1.0;
			var len = this.length();
			this.x /= len * mag;
			this.y /= len * mag;
			return this;
		},
		rotate: function(ang) {
			var _x = this.x;
			this.x = _x * Math.cos(ang) - this.y * Math.sin(ang)
			this.y = _x * Math.sin(ang) + this.y * Math.cos(ang)
			return this;
		},
		angle: function() {
			return Math.atan2( this.y, this.x );
		},
		check: function(p) {
			if(!p) throw "cannot access property of a null object.";
			return p != 'undefined';
		},
		toString: function() {
			return "{x:"+this.x+",y:"+this.y+"}";
		}
	};
	window.Natural.Dot = Dot;
}(window));
// Point
(function(window) {
	var Point = function(px, py, pz, pw) {
		px = typeof(px) != 'undefined' ? px : 0;
		py = typeof(py) != 'undefined' ? py : 0;
		pz = typeof(pz) != 'undefined' ? pz : 0;
		pw = typeof(pw) != 'undefined' ? pw : 0;
		this.init(px, py, pz, pw);
	};
	Point.prototype = {
		x: 0,
		y: 0,
		z: 0,
		w: 0,
		init: function(px, py, pz, pw) {
			this.x = px;
			this.y = py;
			this.z = pz;
			this.w = pw;
		},
		clone: function() {
			return new Point(this.x, this.y, this.z, this.w);
		},
		copy: function() {
			if(arguments.length > 1) {
				this.x = arguments[0] || 0;
				this.y = arguments[1] || 0;
				this.z = arguments[2] || 0;
				this.w = arguments[3] || 0;
			} else {
				var arg0 = arguments[0];
				if(arg0 instanceof Point) {
					this.x = arg0.x;
					this.y = arg0.y;
					this.z = arg0.z;
					this.w = arg0.w;
				} else {
					this.x = arg0;
				}
			}
			return this;
		},
		buildWithAngleR: function( R, angle ) {
			this.x = R * Math.cos( angle );
			this.y = R * Math.sin( angle );
			return this;
		},
		length: function() {
			return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w);
		},
		add: function(p) {
			if(!this.check(p)) return;
			this.x += p.x;
			this.y += p.y;
			this.z += p.z;
			this.w += p.w;
			return this;
		},
		add_r: function(p) {
			if(!this.check(p)) return;
			return new Point(this.x + p.x, this.y + p.y, this.z + p.z, this.w + p.w);
		},
		sub: function(p) {
			if(!this.check(p)) return;
			this.x -= p.x;
			this.y -= p.y;
			this.z -= p.z;
			this.w -= p.w;
			return this;
		},
		sub_r: function(p) {
			if(!this.check(p)) return;
			return new Point(
				this.x - p.x,
				this.y - p.y,
				this.z - p.z,
				this.w - p.w
			);
		},
		normalize: function(mag) {
			mag = typeof(mag) != 'undefined' ? mag : 1.0;
			var len = this.length();
			this.x /= len * mag;
			this.y /= len * mag;
			this.z /= len * mag;
			this.w /= len * mag;
			return this;
		},
		rotate: function(ang) {
			var _x = this.x;
			this.x = _x * Math.cos(ang) - this.y * Math.sin(ang)
			this.y = _x * Math.sin(ang) + this.y * Math.cos(ang)
			return this;
		},
		angle: function() {
			return Math.atan2( this.y, this.x );
		},
		check: function(p) {
			if(!p) throw "cannot access property of a null object.";
			return p != 'undefined';
		},
		toString: function() {
			return "{x:"+this.x+",y:"+this.y+",z:"+this.z+",w:"+this.w+"}";
		}
	};
	window.Natural.Point = Point;
}(window));
// rect
(function(window) {
	var Rect = function(x, y, w, h) {
		x = x || 0;
		y = y || 0;
		w = w || 0;
		h = h || 0;
		this.x = x;
		this.y = y;
		this.width = w;
		this.height = h;
	};
	Rect.prototype = {
		tl: function() { return new Point(this.x, this.y); },
		tr: function() { return new Point(this.x + this.width, this.y); },
		bl: function() { return new Point(this.x, this.y + this.height); },
		br: function() { return new Point(this.x + this.width, this.y + this.height); }
	};
	window.Natural.Rect = Rect;
}(window));
// Camera
// Properties:
// - projection (projection matrix)
// - view port (rectangle)
// - view (transformation of camera)
// - a function to return all transformation
(function(window) {
	var Camera = function(gl) {
		if(typeof(mat4) != 'undefined') {
			this.projection = mat4.create();
			this.transform = mat4.create();
			this.view = new Natural.Rect();
			this.up = vec3.fromValues(0,1,0);
		}
	};
	Camera.prototype = {
		perspective: function(fov, near, far) {
			// rely on glMatrix, should implement ours in future
			if(typeof(mat4) != 'undefined') {
				this.projection = mat4.create();
				mat4.perspective(this.projection, fov, this.view.width/this.view.height, near, far);
			}
		},
		orthogonal: function(left, right, bottom, top, near, far) {
			if(typeof(mat4) != 'undefined') {
				this.projection = mat4.create();
				mat4.ortho(this.projection, left, right, bottom, top, near, far);
			}
		},
		lookAt: function(eye, target, up) {
			if(typeof(mat4) != 'undefined') {
				if(typeof(up) != 'undefined') vec3.copy(this.up, up);
				this.transform = mat4.create();
				mat4.lookAt(this.transform, eye, target, this.up);
			}
		},
		viewport: function(x, y, w, h) {
			this.view.x = x;
			this.view.y = y;
			this.view.width = w;
			this.view.height = h;
		},
		mvp: function() {
			var m44 = mat4.create();
			mat4.mul(m44, this.projection, this.transform);
			return m44;
		}
	};
	window.Natural.Camera = Camera;
}(window));
// Graphic
(function(window) {
var _point_vs = "attribute vec2 aV2Position;\n\
uniform mat4 uM4Projection;\n\
uniform mat4 uM4CameraTransform;\n\
uniform mat4 uM4Transform;\n\
uniform float uF1PointSize;\n\
void main(void) {\n\
gl_PointSize = uF1PointSize;\n\
gl_Position = uM4Projection * uM4CameraTransform * uM4Transform * vec4(aV2Position.x, aV2Position.y, 1.0, 1.0);\n\
}";
var _point_fs = "#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
uniform vec4 uV4Color;\n\
void main(void) {\n\
gl_FragColor = uV4Color;\n\
}";
var _colorfill_vs = "attribute vec2 aV2Position;\n\
uniform mat4 uM4Projection;\n\
uniform mat4 uM4CameraTransform;\n\
uniform mat4 uM4Transform;\n\
void main(void) {\n\
gl_Position = uM4Projection * uM4CameraTransform * uM4Transform * vec4(aV2Position.x, aV2Position.y, 1.0, 1.0);\n\
}";
var _colorfill_fs = "#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
uniform vec4 uV4Color;\n\
void main(void) {\n\
gl_FragColor = uV4Color;\n\
}";
var _texturefill_vs = "attribute vec2 aV2Position;\n\
attribute vec2 aV2Texcoord;\n\
uniform mat4 uM4Projection;\n\
uniform mat4 uM4CameraTransform;\n\
uniform mat4 uM4Transform;\n\
varying vec2 vV2Texcoord;\n\
void main(void) {\n\
vV2Texcoord = aV2Texcoord;\n\
gl_Position = uM4Projection * uM4CameraTransform * uM4Transform * vec4(aV2Position.x, aV2Position.y, 1.0, 1.0);\n\
}";
var _texturefill_fs = "#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
uniform float uF1Alpha;\n\
uniform sampler2D uS2Texture;\n\
varying vec2 vV2Texcoord;\n\
void main(void) {\n\
vec4 color = texture2D(uS2Texture, vV2Texcoord);\n\
color.a *= uF1Alpha;\n\
gl_FragColor = color;\n\
}";
	var POINT_DRAW = 'pointDraw';
	var LINE_DRAW = 'lineDraw';
	var COLOR_FILL = 'colorFill';
	var TEXTURE_FILL = 'textureFill';
	var SHADER_FILL = 'shaderFill';

	// mini 2d engine
	var Graphic = function(gl, flipY, opts) {
		
		this.gl = gl;

		if(typeof(flipY) == 'undefined') flipY = true;
		if(typeof(opts) == 'undefined') opts = {};

		this.canvas = typeof(opts.canvas) == 'undefined'? gl.canvas: opts.canvas;
		this.drawWidth = typeof(opts.width) == 'undefined'? gl.canvas.width: opts.width;
		this.drawHeight = typeof(opts.height) == 'undefined'? gl.canvas.height: opts.height;

		// why use multiple shaders? hmm.. i don't know.. still figuring how to do all in one shader program
		this.pointShader = new Natural.Shader(gl,_point_vs,_point_fs);
		this.fillShader = new Natural.Shader(gl,_colorfill_vs,_colorfill_fs);
		this.textureShader = new Natural.Shader(gl,_texturefill_vs,_texturefill_fs);

		this.shader = this.fillShader;
		this.shaderType = COLOR_FILL;
		this.drawType = "triangleStrip";

		this.index = 0;
		this.vertices = [];
		this.indices = [];
		this.texcoords = [];
		this.points = [];
		this.color = [0.0, 0.0, 0.0, 1.0];
		this.ccolor = [0.0,0.0,0.0,0.0];
		
		this.img = null;
		this.imgAlpha = 1.0;
		this.texture = null;
		this.textures = [];

		this.thickness = 1.0;
		this.pointSize = 1.0;

		this.camera = new Natural.Camera();
		this.camera.viewport(0,0, this.drawWidth, this.drawHeight);
		this.camera.orthogonal(0, this.drawWidth, (flipY)? this.drawHeight: 0, (flipY)? 0 :this.drawHeight, -1, 10);
		this.flipY = flipY;

		this.transform = mat4.create();

		this.matrices = [];

		this.gw = 1;
		this.gh = 1;
		this.toffx = 0;
		this.toffy = 0;
		this.frame = 0;

		this.verticeCount = 0;
		this.useDE = false;
		this.useP2T = false;

		// setup stuff
		gl.enable (gl.BLEND);
		//_gl.blendFunc(_gl.ONE, _gl.ONE_MINUS_SRC_ALPHA);

		// see http://mrdoob.github.io/webgl-blendfunctions/blendfuncseparate.html
		gl.blendEquationSeparate( gl.FUNC_ADD, gl.FUNC_ADD );
		gl.blendFuncSeparate( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA );
//		gl.enable(gl.DEPTH_TEST);

		this.clear();
	};
	Graphic.utils = {
		shaders: {
			point: {
				vs: _point_vs,
				fs: _point_fs
			},
			color: {
				vs: _colorfill_vs,
				fs: _colorfill_fs
			},
			texture: {
				vs: _texturefill_vs,
				fs: _texturefill_fs
			}
		}
	};
	Graphic.prototype = {
		genTexture: function(value) {
			if(value instanceof ImageTexture) return value;
			if(typeof(value.texId) == 'undefined') value.texId = this.textures.length;
			if(typeof(this.textures[value.texId]) == 'undefined') {
				this.textures[value.texId] = (value instanceof Image)? new ImageTexture(this.gl): value;
				if(value instanceof Image)
					this.textures[value.texId].setValue(value, {flipY: !this.flipY});
			}
			return this.textures[value.texId];
		},
		clear: function() {
			var gl = this.gl;
			var c = this.ccolor;
			gl.clearColor(c[0],c[1],c[2],c[3]);
			gl.viewport(0, 0, this.drawWidth, this.drawHeight);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		},
		begin: function() {
			this.useDE = false;
			this.verticeCount = 0;
			this.index = 0;
			this.points = [];
			this.vertices = [];
			this.indices = [];
			this.texcoords = [];
		},
		beginPoint: function(color, size, alpha) {
			if(typeof(color) == 'undefined') color = [0.0, 0.0, 0.0];
			if(typeof(size) == 'undefined') size = 1.0;
			if(typeof(alpha) == 'undefined') alpha = 1.0;
			this.color = color;
			this.color.push(alpha);
			this.pointSize = size;
			this.useP2T = false;
			this.shaderType = POINT_DRAW;
			this.drawType = 'points';
			this.shader = this.pointShader;
			this.begin();
		},
		blendOff: function() {
			this.gl.disable (this.gl.BLEND);
		},
		blendOn: function() {
			this.gl.enable (this.gl.BLEND);
		},
		clearColor: function(r,g,b,a) {
			if(typeof(r) == 'undefined') r = 0.0;
			if(typeof(g) == 'undefined') r = 0.0;
			if(typeof(b) == 'undefined') r = 0.0;
			if(typeof(a) == 'undefined') r = 0.0;
			this.ccolor = [r,g,b,a];
			this.gl.clearColor(r,g,b,a);
		},
		setSize: function(w,h, flipY) {
			if(typeof(flipY) == 'undefined') flipY = true;
			this.drawWidth = typeof(w) == 'undefined'? this.gl.canvas.width: w;
			this.drawHeight = typeof(h) == 'undefined'? this.gl.canvas.height: h;
			this.camera.viewport(0,0, this.drawWidth, this.drawHeight);
			this.camera.orthogonal(0, this.drawWidth, (flipY)? this.drawHeight: 0, (flipY)? 0 :this.drawHeight, -1, 10);
		},
		beginLine: function(color, thickness, alpha) {
			if(typeof(color) == 'undefined') color = [0.0, 0.0, 0.0];
			if(typeof(thickness) == 'undefined') thickness = 1.0;
			if(typeof(alpha) == 'undefined') alpha = 1.0;
			if(typeof(DE) == 'undefined') DE = false;
			this.color = color;
			this.color.push(alpha);
			this.thickness = thickness;
			this.useP2T = false;
			this.shaderType = LINE_DRAW;
			this.drawType = 'lineStrip';
			this.shader = this.fillShader; // reuse color fill
			this.begin();
		},
		beginFill: function(color, alpha, P2T) {
			if(typeof(color) == 'undefined') color = [0.0, 0.0, 0.0];
			if(typeof(alpha) == 'undefined') alpha = 1.0;
			if(typeof(P2T) == 'undefined') P2T = false;
			this.color = color;
			this.color.push(alpha);
			this.useP2T = P2T;
			this.shaderType = COLOR_FILL;
			this.drawType = (P2T)? 'triangles': 'trianglefan';
			this.shader = this.fillShader;
			this.begin();
		},
		beginFillImage: function(img, alpha, P2T) {
			if(typeof(P2T) == 'undefined') P2T = false;
			this.imgAlpha = typeof(alpha) == 'undefined'? 1.0: alpha;
			if(img !== this.img) {
				this.img = img;
				this.texture = this.genTexture(img);
				this.textureShader.updateUniform("uS2Texture", this.texture);
			}
			this.useP2T = P2T;
			this.shaderType = TEXTURE_FILL;
			this.drawType = (P2T)? 'triangles': 'trianglefan';
			this.shader = this.textureShader;
			this.begin();
		},
		beginFillImageSprite: function(img, alpha, gw, gh, frame, P2T) {
			if(typeof(P2T) == 'undefined') P2T = false;
			this.gw = 1/gw;
			this.gh = 1/gh;
			this.frame = frame;
			var c = gw;
			var x = frame % c;
			var y = Math.floor(frame / c);
			this.toffx = x * this.gw;
			this.toffy = y * this.gh;

			this.imgAlpha = typeof(alpha) == 'undefined'? 1.0: alpha;
			if(img !== this.img) {
				this.img = img;
				this.texture = this.genTexture(img);
				this.textureShader.updateUniform("uS2Texture", this.texture);
			}
			this.useP2T = P2T;
			this.shaderType = TEXTURE_FILL;
			this.drawType = (P2T)? 'triangles': 'trianglefan';
			this.shader = this.textureShader;
			this.begin();
		},
		beginFillShader: function(sdr, img, alpha, P2T) {
			if(typeof(P2T) == 'undefined') P2T = false;
			this.imgAlpha = typeof(alpha) == 'undefined'? 1.0: alpha;
			this.useP2T = P2T;
			this.shaderType = SHADER_FILL;
			this.drawType = (P2T)? 'triangles': 'trianglefan';
			if(sdr !== this.shader) {
				this.shader = sdr || this.textureShader;
				this.img = null;
			}
			if(img !== this.img) {
				this.img = img;
				this.texture = this.genTexture(img);
				this.shader.updateUniform("uS2Texture", this.texture);
			}
			this.begin();
		},
		drawCircle: function(x, y, r, s) {
			var vsize = typeof(s) == 'undefined'? 16: s;
			var rad = Math.PI * 2 / vsize;
			var vx = x + r;
			var vy = y;
			this.moveTo(vx, vy);
			for(var i = 1; i < vsize; i++) {
				vx = x + Math.cos(rad * i) * r;
				vy = y + Math.sin(rad * i) * r;
				this.lineTo(vx, vy);
			}
		},
		drawRect: function(x, y, w, h) {
			this.breakConnection();

			if(!this.useDE) {
				this.end();
				this.begin();
			}

			var index = this.index;
			this.vertices.push(x,y,x+w,y,x+w,y+h,x,y+h);
			if(this.gw < 1 || this.gh < 1) {
				var t = [0.0,0.0, 1.0,0.0, 1.0, 1.0, 0.0, 1.0];
				for(var i = 0; i < t.length; i+=2) {
					this.texcoords.push(t[i] * this.gw + this.toffx, t[i+1] * this.gh + this.toffy);
				}
			} else this.texcoords.push(0.0,0.0, 1.0,0.0, 1.0, 1.0, 0.0, 1.0);
			this.indices.push(index,index+1,index+3, index+1,index+3,index+2);
			this.verticeCount = 4;
			this.index += 4;
		},
		validBreak: function() {
			if(this.shaderType == POINT_DRAW && this.points.length < 1) return false;
			else if(this.shaderType == LINE_DRAW && this.points.length < 2) return false;
			else if((this.shaderType == TEXTURE_FILL || this.shaderType == SHADER_FILL || this.shaderType == COLOR_FILL) && this.points.length < 3) return false;
			return true;
		},
		breakConnection: function(DE) {
			if(typeof(DE) == 'undefined') DE = false;

			if(this.useP2T) {
				// only for colorFill/textureFill

				if(this.points.length < 3) return false;

				// from example
				var swctx = null;
		        try {
		            // prepare SweepContext
		            swctx = new js.poly2tri.SweepContext(this.points.slice(0));
		            // triangulate
		            js.poly2tri.sweep.Triangulate(swctx);
		        } catch (e) {
		            // do nothing if there is error
		            this.points = [];
		            return false;
		        }

		        // extract indices
		        var index = this.index;
		        var indices = this.indices;
		        swctx.GetTriangles().forEach(function(t) {
		        	indices.push(
		        		t.GetPoint(0).id + index,
		        		t.GetPoint(1).id + index,
		        		t.GetPoint(2).id + index
		        	);
		        });

		        // push vertices
		        var point = null;
				for(var i = 0; i < this.points.length; i++) {
					point = this.points[i];
					this.vertices.push(point.x, point.y);
				}

				this.useDE = true;
			} else {
				if(!this.validBreak()) return false;

				var point = null;
				for(var i = 0; i < this.points.length; i++) {
					point = this.points[i];
					this.vertices.push(point.x, point.y);
					if(DE) this.indices.push(this.index + i);
				}
				if(DE) this.useDE = true;
			}

			if(this.shaderType == TEXTURE_FILL || this.shaderType == SHADER_FILL) {
				// ...
				var rad = Math.PI * 2 / (this.points.length);
				var vx = 0;
				var vy = 0;
				for(var i = 0; i < this.points.length; i++) {
					vx = (Math.cos(rad * i) * 0.5 + 0.5) * this.gw + this.toffx;
					vy = (Math.sin(rad * i) * 0.5 + 0.5) * this.gh + this.toffy;
					this.texcoords.push(vx, vy);
				}
			}

			this.index += this.points.length;
	        
	        // for drawarray
			this.verticeCount = this.points.length;

			this.points = [];
			return true;
		},
		addPoint: function(x, y) {
			var p = new js.poly2tri.Point(x, y);
			p.id = this.points.length;
			this.points.push(p);
		},
		point: function(x, y) {
			this.addPoint(x, y);
		},
		moveTo: function(x, y) {
			this.breakConnection();

			if(!this.useDE) {
				this.end();
				this.begin();
			}

			this.addPoint(x, y);
		},
		lineTo: function(x, y) {
			this.addPoint(x, y);
		},
		popMatrix: function() {
			if(this.matrices.length > 0) {
				mat4.copy(this.transform, this.matrices.pop());
				this.shader.updateUniform("uM4Transform", this.transform);
			}
		},
		pushMatrix: function() {
			this.matrices.push(mat4.clone(this.transform));
		},
		rotate3d: function(degree, vec) {
			mat4.rotate(this.transform, this.transform, degree / 180 * Math.PI, vec);
		},
		rotate: function(degree) {
			this.rotate3d(degree, [0,0,1]);
		},
		rotateCenter: function(cx, cy, degree) {
			// move to center
			this.translate([cx, cy, 0]);
			this.rotate(degree);
			// move back
			this.translate([-cx, -cy, 0]);
		},
		translate: function(vec) {
			mat4.translate(this.transform, this.transform, vec);
		},
		scale: function(vec) {
			mat4.scale(this.transform, this.transform, vec);
		},
		flip: function() {
			this.scale([1,-1,1]);
			this.translate([0,-this.canvas.height,0]);
		},
		afterEnd: function() {
			this.gw = 1;
			this.gh = 1;
			this.toffx = 0;
			this.toffy = 0;
			this.frame = 0;
		},
		valid: function() {
			if(this.shaderType == TEXTURE_FILL || this.shaderType == SHADER_FILL || this.shaderType == COLOR_FILL)
				if(this.vertices.length < 6) return false;
			else if(this.shaderType == LINE_DRAW)
				if(this.vertices.length < 4) return false;
			else if(this.shaderType == POINT_DRAW)
				if(this.vertices.length < 2) return false;
			return true;
		},
		end: function(DE) {
			// if you want to use DE, make sure it the indices is correct
			if(typeof(DE) == 'undefined') DE = false;

			this.breakConnection(DE);

			if(!this.valid()) return;

			this.shader.bind();

			// share
			this.shader.updateUniform("uM4Projection", this.camera.projection);
			this.shader.updateUniform("uM4CameraTransform", this.camera.transform);
			this.shader.updateUniform("uM4Transform", this.transform);
			this.shader.updateAttribute("aV2Position", this.vertices);

			// optional
			if(this.shaderType == TEXTURE_FILL || this.shaderType == SHADER_FILL) {
				this.shader.updateAttribute("aV2Texcoord", this.texcoords);
				this.shader.updateUniform("uF1Alpha", this.imgAlpha);
			}

			if(this.shaderType == COLOR_FILL || this.shaderType == LINE_DRAW || this.shaderType == POINT_DRAW)
				this.shader.updateUniform("uV4Color", this.color);

			if(this.shaderType == POINT_DRAW)
				this.shader.updateUniform("uF1PointSize", this.pointSize);

			if(this.shaderType == LINE_DRAW)
				if(typeof(this.gl.lineWidth) != 'undefined')
					this.gl.lineWidth(this.thickness);

			this.shader.uploadAttributes();

			//draw
			if(this.useDE)
				this.shader.drawElement(this.indices, this.drawType);
			else
				this.shader.drawArray(this.vertices.length / 2, this.drawType);
			
			// ending
			this.shader.unbind();
	        this.afterEnd();
		},
		draw: function(pack) {
			this.shader.bind();
			this.shader.updateUniform("uM4Projection", this.camera.projection);
			this.shader.updateUniform("uM4CameraTransform", this.camera.transform);
			this.shader.updateUniform("uM4Transform", this.transform);
			this.shader.updateUniform("uF1Alpha", this.imgAlpha);
			this.shader.updateAttribute("aV2Texcoord", pack.texcoords);
			this.shader.updateAttribute("aV2Position", pack.vertices);
			this.shader.uploadAttributes();
			this.shader.drawElement(pack.indices);
	        this.shader.unbind();
		},
		buildPlane: function(x, y, w, h) {
			this.vertices = [x,y,x+w,y,x+w,y+h,x,y+h];
			if(this.texcoords)
				this.texcoords = [0.0,0.0, 1.0,0.0, 1.0, 1.0, 0.0, 1.0];
			if(this.indices)
				this.indices = [0,1,3, 1,2,3];
		},
		drawImage: function(img, x, y, w, h, a) {
			this.imgAlpha = typeof(a) == 'undefined'? 1.0: a;
			this.beginFillImage(img, a);

			this.buildPlane(x,y,w,h);

			this.draw(this);
		},
		drawShader: function(sdr, img, x, y, w, h, a) {
			this.imgAlpha = typeof(a) == 'undefined'? 1.0: a;
			this.beginFillShader(sdr, img, a);

			this.buildPlane(x,y,w,h);

			this.draw(this);
		}
	};
	window.Natural.Graphic = Graphic;
}(window));
// VerticesPackage
(function(window) {
	var VPackage = function() {
		this.vertices = [];
		this.texcoords = [];
		this.indices = [];
		this.normals = [];
	};
	VPackage.prototype = {

	};
	window.Natural.VPackage = VPackage;
}(window));
// VerticesFactory
(function(window) {
	var VFactory = function() {
	};
	VFactory.genPlane2D = function(x,y,w,h) {
		if(typeof(x) == 'undefined') x = 0;
		if(typeof(y) == 'undefined') y = 0;
		if(typeof(w) == 'undefined') w = 1;
		if(typeof(h) == 'undefined') h = 1;
		var new_package = new Natural.VPackage();
		new_package.vertices.push(x,y, x+w,y, x+w,y+h, x,y+h);
		new_package.indices.push(0,1,3, 1,3,2);
		new_package.texcoords.push(0.0,0.0, 1.0,0.0, 1.0, 1.0, 0.0, 1.0);
		return new_package;
	};
	VFactory.genPlane2DCenter = function(x,y,w,h) {
		if(typeof(x) == 'undefined') x = 0;
		if(typeof(y) == 'undefined') y = 0;
		if(typeof(w) == 'undefined') w = 1;
		if(typeof(h) == 'undefined') h = 1;
		return VFactory.genPlane(x-w/2,y-h/2,w,h);
	};
	VFactory.genQuadPlane = function(x,y,z,w,h) {
		if(typeof(x) == 'undefined') x = 0;
		if(typeof(y) == 'undefined') y = 0;
		if(typeof(z) == 'undefined') z = 0;
		if(typeof(w) == 'undefined') w = 1;
		if(typeof(h) == 'undefined') h = 1;
		var new_package = new Natural.VPackage();
		new_package.vertices.push(x,y,0, x+w,y,0, x+w,y+h,0, x,y+h,0);
		new_package.normals.push(0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1);
		//new_package.indices.push(0,1,3, 1,2,3);
		new_package.indices.push(0,1,2,3);
		new_package.texcoords.push(0.0,0.0, 1.0,0.0, 1.0, 1.0, 0.0, 1.0);
		return new_package;
	};
	VFactory.genQuadPlaneCenter = function(x,y,z,w,h) {
		if(typeof(x) == 'undefined') x = 0;
		if(typeof(y) == 'undefined') y = 0;
		if(typeof(z) == 'undefined') z = 0;
		if(typeof(w) == 'undefined') w = 1;
		if(typeof(h) == 'undefined') h = 1;
		return Natural.VFactory.genQuadPlane(x-w/2,y-h/2,z,w,h);
	};
	VFactory.genPlane = function(x,y,z,w,h) {
		if(typeof(x) == 'undefined') x = 0;
		if(typeof(y) == 'undefined') y = 0;
		if(typeof(z) == 'undefined') z = 0;
		if(typeof(w) == 'undefined') w = 1;
		if(typeof(h) == 'undefined') h = 1;
		var new_package = new Natural.VPackage();
		new_package.vertices.push(x,y,0, x+w,y,0, x+w,y+h,0, x,y+h,0);
		new_package.normals.push(0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1);
		new_package.indices.push(0,1,3, 1,2,3);
		new_package.texcoords.push(0.0,0.0, 1.0,0.0, 1.0, 1.0, 0.0, 1.0);
		return new_package;
	};
	VFactory.genPlaneCenter = function(x,y,z,w,h) {
		if(typeof(x) == 'undefined') x = 0;
		if(typeof(y) == 'undefined') y = 0;
		if(typeof(z) == 'undefined') z = 0;
		if(typeof(w) == 'undefined') w = 1;
		if(typeof(h) == 'undefined') h = 1;
		return Natural.VFactory.genPlane(x-w/2,y-h/2,z,w,h);
	};
	VFactory.genCube = function(x,y,z,w,h,d) {
		if(typeof(x) == 'undefined') x = 0;
		if(typeof(y) == 'undefined') y = 0;
		if(typeof(z) == 'undefined') z = 0;
		if(typeof(w) == 'undefined') w = 1;
		if(typeof(h) == 'undefined') h = 1;
		if(typeof(d) == 'undefined') d = 1;
		var new_package = new Natural.VPackage();
		// http://www.cs.utexas.edu/~fussell/courses/cs354/code/assignment4/texture_demo.cpp
		new_package.vertices.push(
			  x,   y,   z,
			x+w,   y,   z,
			x+w,   y, z-d,
			  x,   y, z-d,
			  x, y+h,   z,
			x+w, y+h,   z,
			x+w, y+h, z-d,
			  x, y+h, z-d
    	); 
		new_package.indices.push(
			0, 1, 4,
			1, 5, 4,
			1, 2, 5,
			2, 6, 5,
			2, 3, 6,
			3, 7, 6,
			3, 0, 7,
			0, 4, 7,
			4, 5, 7,
			5, 6, 7,
			3, 2, 0,
			2, 1, 0
		),
		new_package.texcoords.push(
			0.0, 0.0,
			1.0, 0.0,
			1.0, 0.0,
			0.0, 0.0,
			0.0, 1.0,
			1.0, 1.0,
			1.0, 1.0,
			0.0, 1.0
		);
		return new_package;
	};
	VFactory.genCubeCenter = function(x,y,z,w,h,d) {
		if(typeof(x) == 'undefined') x = 0;
		if(typeof(y) == 'undefined') y = 0;
		if(typeof(z) == 'undefined') z = 0;
		if(typeof(w) == 'undefined') w = 1;
		if(typeof(h) == 'undefined') h = 1;
		if(typeof(d) == 'undefined') d = 1;
		return Natural.VFactory.genCube(x-w/2,y-h/2,z+d/2,w,h,d);
	};
	VFactory.genCubeCompleteCenter = function(x,y,z,w,h,d) {
		// exported from blender, export type is .x3d, after triangulate faces, recalculate normals, use smart uv map, export normals, uv, still not very good one
		if(typeof(x) == 'undefined') x = 0;
		if(typeof(y) == 'undefined') y = 0;
		if(typeof(z) == 'undefined') z = 0;
		if(typeof(w) == 'undefined') w = 1;
		if(typeof(h) == 'undefined') h = 1;
		if(typeof(d) == 'undefined') d = 1;
		x = x + w/2;
		y = y + h/2;
		z = z - d/2;
		var new_package = new Natural.VPackage();
		new_package.vertices.push(
			  x,   y,   z,
			  x, y-h,   z,
			x-w, y-h,   z,
			  x,   y, z+d,
			x-w,   y, z+d,
			  x, y-h, z+d,
			  x,   y,   z,
			  x,   y, z+d,
			  x, y-h,   z,
			  x, y-h,   z,
			  x, y-h, z+d,
			x-w, y-h,   z,
			x-w, y-h,   z,
			x-w, y-h, z+d,
			x-w,   y, z+d,
			  x,   y, z+d,
			  x,   y,   z,
			x-w,   y,   z,
			x-w,   y,   z,
			x-w, y-h, z+d,
			  x, y-h, z+d,
			x-w, y-h, z+d,
			x-w,   y,   z,
			x-w,   y, z+d
		);
		new_package.normals.push(
			 0.577349,  0.577349, -0.577349,
			 0.577349, -0.577349, -0.577349,
			-0.577349, -0.577349, -0.577349,
			 0.577349,  0.577349,  0.577349,
			-0.577349,  0.577349,  0.577349,
			 0.577349, -0.577349,  0.577349,
			 0.577349,  0.577349, -0.577349,
			 0.577349,  0.577349,  0.577349,
			 0.577349, -0.577349, -0.577349,
			 0.577349, -0.577349, -0.577349,
			 0.577349, -0.577349,  0.577349,
			-0.577349, -0.577349, -0.577349,
			-0.577349, -0.577349, -0.577349,
			-0.577349, -0.577349,  0.577349,
			-0.577349,  0.577349,  0.577349,
			 0.577349,  0.577349,  0.577349,
			 0.577349,  0.577349, -0.577349,
			-0.577349,  0.577349, -0.577349,
			-0.577349,  0.577349, -0.577349,
			-0.577349, -0.577349,  0.577349,
			 0.577349, -0.577349,  0.577349,
			-0.577349, -0.577349,  0.577349,
			-0.577349,  0.577349, -0.577349,
			-0.577349,  0.577349,  0.577349
		);
		new_package.texcoords.push(
			0.0000, 0.3344,
			0.3323, 0.3333,
			0.3333, 0.6656,
			1.0000, 0.0010,
			0.9990, 0.3333,
			0.6677, 0.0000,
			0.9990, 0.3333,
			1.0000, 0.6656,
			0.6667, 0.3344,
			0.3344, 0.6667,
			0.3333, 0.3344,
			0.6667, 0.6656,
			0.3333, 0.3323,
			0.0010, 0.3333,
			0.0000, 0.0010,
			0.3333, 0.0010,
			0.6656, 0.0000,
			0.6667, 0.3323,
			0.0010, 0.6667,
			0.6667, 0.3323,
			0.6677, 0.6667,
			0.6656, 0.3333,
			0.3323, 0.0000,
			0.3344, 0.3333
		);
		new_package.indices.push(
			 0,  1,  2,
			 3,  4,  5,
			 6,  7,  8,
			 9, 10, 11,
			12, 13, 14,
			15, 16, 17,
			18,  0,  2,
			 4, 19,  5,
			 7, 20,  8,
			10, 21, 11,
			22, 12, 14,
			23, 15, 17
		);
		return new_package;
	};
	VFactory.prototype = {

	};
	window.Natural.VFactory = VFactory;
}(window));
// Controls
(function(window) {
	// completely cloned from threejs, just modified to use glmatrix, see TrackballControls.js
	var CameraControl = function(camera, cameraPosition, lookTarget, bindTarget) {
		if(bindTarget === undefined) bindTarget = document;
		this.bindTarget = bindTarget;
		this.camera = camera;
		this.look = typeof(lookTarget) != 'undefined' ? lookTarget: vec3.create();
		this.origin = vec3.clone(cameraPosition);
		this.oriUp = vec3.clone(this.camera.up);
		this.cameraPosition = cameraPosition;

		var self = this;
		var md = function(e) {
			e.preventDefault();
			e.stopPropagation();

			self.mouseDown(e);

			self.bindTarget.addEventListener( 'mousemove' , mm, false );
			self.bindTarget.addEventListener( 'mouseup' , mu, false );
		};
		var mm = function(e) {
			e.preventDefault();
			e.stopPropagation();

			self.mouseMove(e);
		};
		var mu = function(e) {
			e.preventDefault();
			e.stopPropagation();

			self.mouseUp(e);
		};

		bindTarget.addEventListener('mousedown', md, false);
		bindTarget.addEventListener('dblclick', function(e) {
			// reset
			vec3.copy(self.cameraPosition, self.origin);
			vec3.copy(self.camera.up, self.oriUp);
			self.camera.lookAt(self.cameraPosition, self.look);
		}, false);

		this.rotateStart = vec3.create();//{x: 0.0, y: 0.0, z: 0.0};
		this.rotateEnd = vec3.create();//{x: 0.0, y: 0.0, z: 0.0};

		this.radius = ( this.camera.view.width + this.camera.view.height ) / 4;

		var d = Natural.Utils.decomposeMat4(this.camera.transform);
		this.eye = vec3.fromValues(d.position.x, d.position.y, d.position.z);
		vec3.sub(this.eye, this.eye, this.look);

		this.dragging = false;
	};
	CameraControl.prototype = {
		normal: function() {
			var _r = vec3.create();
			vec3.sub(_r, this.cameraPosition, this.look);
			return _r;
		},
		getMouseProjectionOnBall: function( clientX, clientY ) {
			var mouseOnBall = vec3.fromValues(
				( clientX - this.camera.view.width * 0.5 ) / this.radius,
				( this.camera.view.height * 0.5 - clientY ) / this.radius,
				0.0
			);

			var length = vec3.length(mouseOnBall);
		
			if( length > 1.0 ) {
				// normalized
				vec3.normalize(mouseOnBall, mouseOnBall);
			} else {
				mouseOnBall[2] = Math.sqrt(1.0 - length * length);
			}

			vec3.sub(this.eye, this.cameraPosition, this.look);

			var proj = vec3.clone( this.camera.up );
			vec3.normalize(proj, proj);
			vec3.scale(proj, proj, mouseOnBall[1]);

			var c = vec3.create();
			vec3.cross(c, vec3.clone(this.camera.up), this.eye);
			vec3.normalize(c, c);
			vec3.scale(c, c, mouseOnBall[0]);

			vec3.add(proj, proj, c );

			var e = vec3.clone(this.eye);
			vec3.normalize(e, e);
			vec3.scale(e, e, mouseOnBall[2])

			vec3.add(proj, proj, e);

			return proj;
		},
		transform3x3Mat4: function(out, a, m) {
			var x = a[0], y = a[1], z = a[2];
			out[0] = m[0] * x + m[4] * y + m[8] * z;
			out[1] = m[1] * x + m[5] * y + m[9] * z;
			out[2] = m[2] * x + m[6] * y + m[10] * z;
			return out;
		},
		rotateAround: function( angle, axis) {
			var m = mat4.create();
			mat4.rotate(m, m, -angle, axis);

			this.transform3x3Mat4(this.eye, this.eye, m);

			vec3.copy(this.cameraPosition, this.eye);

			this.transform3x3Mat4(this.camera.up, this.camera.up, m);

			this.camera.lookAt(this.eye, this.look);

			this.transform3x3Mat4(this.rotateEnd, this.rotateEnd, m);

			mat4.identity(m);
			mat4.rotate(m,m, angle*(0.2-1.0), axis);
			this.transform3x3Mat4(this.rotateStart, this.rotateStart, m);
		},
		mouseDown: function( event ) {
			this.rotateStart = this.rotateEnd = this.getMouseProjectionOnBall( event.clientX, event.clientY );
			this.dragging = true;
		},
		mouseUp: function( event ) {
			this.dragging = false;
		},
		mouseMove: function( event ) {
			if(this.dragging) {
				this.rotateEnd = this.getMouseProjectionOnBall( event.clientX, event.clientY );

				var d = vec3.dot(this.rotateStart, this.rotateEnd);
				var rsl = vec3.length(this.rotateStart);
				var rel = vec3.length(this.rotateEnd);
				var angle = Math.acos(d/rsl/rel);

				if(angle) {
					var ax = vec3.create();
					vec3.cross(ax, this.rotateStart, this.rotateEnd);
					vec3.normalize(ax, ax);
					this.rotateAround(angle, ax);
				}
			}
		}
	};
	window.Natural.CameraControl = CameraControl;
}(window));
// Mesh
(function(window) {
	var Mesh = function(gl) {
		this.gl = gl;
		this.vertexBuffer = gl.createBuffer();
	};
	Mesh.prototype = {

	};
	window.Natural.Mesh = Mesh;
}(window));
// Texture
(function(window) {
	var Texture = function (gl) {
		if(typeof(gl) == 'undefined') return;
		this.gl = gl;
		this.id = gl.createTexture();

		gl.bindTexture(gl.TEXTURE_2D, this.id);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	};
	window.Natural.Texture = Texture;
}(window));
// RenderTexture
(function(window) {
	var RenderTexture = function ( gl, w, h, flipY ) {
		if(typeof(gl) == 'undefined') return;

		Natural.Texture.call(this, gl);

		if(typeof(w) == 'undefined') w = 256;
		if(typeof(h) == 'undefined') h = 256;

		if(typeof(flipY) == 'undefined') flipY = false;

		this.framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		this.width = w;
		this.height = h;
		this.framebuffer.width = w;
		this.framebuffer.height = h;

		gl.bindTexture(gl.TEXTURE_2D, this.id);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.framebuffer.width, this.framebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

		this.renderbuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.framebuffer.width, this.framebuffer.height);

		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderbuffer);

		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};
	RenderTexture.prototype = {
		bind: function() {
			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
		},
		unbind: function() {
			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		},
		clear: function() {
			this.bind();
			//this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
			this.gl.viewport(0, 0, this.framebuffer.width, this.framebuffer.height);
			this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
			this.unbind();
		}
	};
	window.Natural.RenderTexture = RenderTexture;
}(window));
// ThreeTexture
(function(window) {
	// obj: {renderer: THREE.WebGLRenderer, camera: THREE.Camera, scene: THREE.Scene}
	var ThreeTexture = function( gl, obj ) {
		Natural.RenderTexture.call(this, gl);

		this.camera = obj.camera;
		this.renderer = obj.renderer;
		this.scene = obj.scene;
	};
	var t = ThreeTexture.prototype = new Natural.RenderTexture();
	t.super_render = t.render; 
	t.render = function()
	{
		var gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.cullFace( gl.BACK ); // quick fix
		this.renderer.render( this.scene, this.camera );
		gl.cullFace( gl.FRONT );
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}
	window.Natural.ThreeTexture = ThreeTexture;
}(window));
// ImageTexture
(function(window) {
	var ImageTexture = function (gl) {
		Natural.Texture.call(this, gl);
	};
	ImageTexture.prototype.setValue = function(value, opts) {
		if(typeof(opts) == 'undefined') opts = {};
		var gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.id);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, (typeof(opts.flipY) == 'undefined')? true: opts.flipY);
		if (typeof(opts.params) != 'undefined') {
			for (var opt in opts.params)
				gl.texParameteri(gl.TEXTURE_2D, opt, opts.params[opt]);
		}
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, value);
	};
	window.Natural.ImageTexture = ImageTexture;
}(window));
// UniformTexture
(function(window) {
	var UniformTexture = function (gl, unit, location, shader) {
		this.gl = gl;
		this.unit = unit;
		this.shader = shader;
		this.location = location;
		
		this.shader.bind();
		gl.activeTexture(gl.TEXTURE0 + this.unit);
		gl.uniform1i(location, this.unit);
	};
	// Upload image into texture.
	// The image can have textureOptions which map texParameteri enums to values.
	UniformTexture.prototype.setValue = function(value) {
		var gl = this.gl;
		gl.activeTexture(gl.TEXTURE0 + this.unit);

		this.shader.bind();

		gl.bindTexture(gl.TEXTURE_2D, value.id);
		gl.uniform1i(this.location, this.unit);
	};
	window.Natural.UniformTexture = UniformTexture;
}(window));
// Uniform
(function(window) {
	var Uniform = function (gl, type, location) {
		this.gl = gl;
		this.uniformLocation = location;
		this.isMatrix = false;
		switch (type) {
			case gl.INT: // int
			case gl.BOOL: // bool
				this.uniformFunction = gl.uniform1i;
				break;
			case gl.INT_VEC2: // ivec2
			case gl.BOOL_VEC2: // bvec2
				this.uniformFunction = gl.uniform2iv;
				this.wrapperConstructor = Int32Array;
				break;
			case gl.INT_VEC3: // ivec3
			case gl.BOOL_VEC3: // bvec3
				this.uniformFunction = gl.uniform3iv;
				this.wrapperConstructor = Int32Array;
				break;
			case gl.INT_VEC4: // ivec4
			case gl.BOOL_VEC4: // ivec4
				this.uniformFunction = gl.uniform4iv;
				this.wrapperConstructor = Int32Array;
				break;
			case gl.FLOAT: // float
				this.uniformFunction = gl.uniform1f;
				break;
			case gl.FLOAT_VEC2: // vec2
				this.uniformFunction = gl.uniform2fv;
				this.wrapperConstructor = Float32Array;
				break;
			case gl.FLOAT_VEC3: // vec3
				this.uniformFunction = gl.uniform3fv;
				this.wrapperConstructor = Float32Array;
				break;
			case gl.FLOAT_VEC4: // vec4
				this.uniformFunction = gl.uniform4fv;
				this.wrapperConstructor = Float32Array;
				break;
			case gl.FLOAT_MAT2: // mat2
				this.uniformFunction = gl.uniformMatrix2fv;
//				this.wrapperConstructor = MatrixArray;
				this.isMatrix = true;
				break;
			case gl.FLOAT_MAT3: // mat3
				this.uniformFunction = gl.uniformMatrix3fv;
//				this.wrapperConstructor = MatrixArray;
				this.isMatrix = true;
				break;
			case gl.FLOAT_MAT4: // mat4
				this.uniformFunction = gl.uniformMatrix4fv;
//				this.wrapperConstructor = MatrixArray;
				this.isMatrix = true;
				break;
			default:
				throw 'Unsupported uniform type ' + type;
		}
	};
	// Set uniform value, can be float or array of floats
	Uniform.prototype.setValue = function(value) {
		this.value = value;
		if (this.wrapperConstructor)
			value = new this.wrapperConstructor(value);

		if(!this.isMatrix)
			this.uniformFunction.call(this.gl, this.uniformLocation, value);
		else
			this.uniformFunction.call(this.gl, this.uniformLocation, false, value);
	};
	window.Natural.Uniform = Uniform;
}(window));
// Attribute
// just direct copy paste from Uniform to modify
(function(window) {
	var Attribute = function (gl, type, location) {
		this.gl = gl;
		this.attributeLocation = location;
//		gl.enableVertexAttribArray(location);
		this.buffer = gl.createBuffer();
		this.stride = 0;
		this.offset = 0;
		this.size = 1;
		this.bytes = 4;

		switch (type) {
			case gl.INT: // int
			case gl.BOOL: // bool
				this.size = 2;
//				this.uniformFunction = gl.uniform1i;
				this.wrapperConstructor = Int32Array;
				break;
			case gl.INT_VEC2: // ivec2
			case gl.BOOL_VEC2: // bvec2
				this.size = 2;
//				this.uniformFunction = gl.uniform2iv;
				this.wrapperConstructor = Int32Array;
				break;
			case gl.INT_VEC3: // ivec3
			case gl.BOOL_VEC3: // bvec3
				this.size = 3;
//				this.uniformFunction = gl.uniform3iv;
				this.wrapperConstructor = Int32Array;
				break;
			case gl.INT_VEC4: // ivec4
			case gl.BOOL_VEC4: // ivec4
				this.size = 4;
//				this.uniformFunction = gl.uniform4iv;
				this.wrapperConstructor = Int32Array;
				break;
			case gl.FLOAT: // float
				this.size = 1;
//				this.uniformFunction = gl.uniform1f;
				this.wrapperConstructor = Float32Array;
				break;
			case gl.FLOAT_VEC2: // vec2
				this.size = 2;
				this.bytes = 4;
//				this.uniformFunction = gl.uniform2fv;
				this.wrapperConstructor = Float32Array;
				break;
			case gl.FLOAT_VEC3: // vec3
				this.size = 3;
				this.bytes = 4;
//				this.uniformFunction = gl.uniform3fv;
				this.wrapperConstructor = Float32Array;
				break;
			case gl.FLOAT_VEC4: // vec4
				this.size = 4;
				this.bytes = 4;
//				this.uniformFunction = gl.uniform4fv;
				this.wrapperConstructor = Float32Array;
				break;
			case gl.FLOAT_MAT2: // mat2
//				this.uniformFunction = gl.uniformMatrix2fv;
//				this.wrapperConstructor = MatrixArray;
				break;
			case gl.FLOAT_MAT3: // mat3
//				this.uniformFunction = gl.uniformMatrix3fv;
//				this.wrapperConstructor = MatrixArray;
				break;
			case gl.FLOAT_MAT4: // mat4
//				this.uniformFunction = gl.uniformMatrix4fv;
//				this.wrapperConstructor = MatrixArray;
				break;
			default:
				throw 'Unsupported uniform type ' + type;
		}
	};
	// Set uniform value, can be float or array of floats
	Attribute.prototype.setValue = function(value, stride, offset) {
		if(typeof(stride) == 'undefined') stride = 0;
		if(typeof(offset) == 'undefined') offset = 0;
		var gl = this.gl;
		this.value = value;
		this.stride = stride * this.wrapperConstructor.BYTES_PER_ELEMENT;
		this.offset = offset * this.wrapperConstructor.BYTES_PER_ELEMENT;
		if (this.wrapperConstructor) 
			value = new this.wrapperConstructor(value);
		//this.uniformFunction.call(this.gl, this.attributeLocation, value);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, value, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.attributeLocation);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.vertexAttribPointer(
			this.attributeLocation,
			this.size,
			gl.FLOAT,
			false,
			this.stride,
			this.offset
		);
	};
	window.Natural.Attribute = Attribute;
}(window));
(function(window) {
	var Renderer = function() {

	};
	window.Natural.Renderer = Renderer();
}(window));