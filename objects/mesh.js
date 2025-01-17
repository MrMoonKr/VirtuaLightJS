class Mesh {
    // 
    constructor(material = new MeshMaterial()) {
        this.material = material;
        this.clear();
    }

    loadOFF(filename) {
        this.clear();
        var sizeV, sizeT, tmp;
        var items = filename.split('\n');

        tmp = items[1].split(' ');
        sizeV = parseInt(tmp[0]);
        sizeT = parseInt(tmp[1]);

        for(var i = 0; i < sizeV; i++){
            tmp = items[i+2].split(' ');
            this.m_positions[i] = $V([parseFloat(tmp[0]),parseFloat(tmp[1]),parseFloat(tmp[2])]);
        }
        for(var i = 0; i < sizeT; i++) {
            tmp = items[i+2+sizeV].split(' ');
            this.m_triangles[i] = $V([parseInt(tmp[1]),parseInt(tmp[2]),parseInt(tmp[3])]);
        }
        
        this.centerAndScaleToUnit ();
        this.recomputeNormalsSimple ();
    }

    loadPly( filename )
    {
        this.clear();

        var sizeV, sizeT, tmp;
        var items = filename.split('\n');
        var idx = 0;

        tmp = items[idx].split(' ');
        // Get rid of everything before the number of vertices 
        while(tmp[1] != "vertex") { 
            idx++;
            tmp = items[idx].split(' ');
        }
        sizeV = parseFloat(tmp[2]);

        // Get rid of everything before the number of triangles 
        while(tmp[1] != "face") { 
            idx++;
            tmp = items[idx].split(' ');
        }
        sizeT = parseFloat(tmp[2]);

        //console.log(sizeV, sizeT);

        // Get rid of remaining header
        while(tmp.length != 8) { 
            idx++;
            tmp = items[idx].split(' ');
        }

        //console.log(tmp);

        for(let i=0; i<sizeV; i++){
            this.m_positions.push($V([tmp[0],tmp[1],tmp[2]]));
            this.m_normals.push($V([tmp[3],tmp[4],tmp[5]]));
            this.m_UV.push($V([tmp[6],tmp[7]]));
            idx++;
            tmp = items[idx].split(' ');
        }

        for(let i=0; i<sizeT; i++){
            this.m_triangles.push($V([tmp[1],tmp[2],tmp[3]]));
            idx++;
            tmp = items[idx].split(' ');
        }

        //this.centerAndScaleToUnit ();
        //console.log(this.m_triangles[0], this.m_triangles[this.m_triangles.length-1]);

    }

    clear () {
        this.m_positions = [];
        this.m_normals   = [];
        this.m_triangles = [];
        this.m_UV        = [];
    }

    centerAndScaleToUnit () {
        var c = $V([0,0,0]);
        var positionsSize = this.m_positions.length;
        for(var i = 0; i < positionsSize; i++){
            c = c.add(this.m_positions[i]);
        }
        c = c.multiply(1.0/positionsSize);

        var maxD = this.m_positions[0].distanceFrom(c);
        for (var i = 0; i < positionsSize; i++){
            var m = this.m_positions[0].distanceFrom(c);
            if (m > maxD){
                maxD = m;
            }
        }

        for(var i = 0; i < positionsSize; i++){
            this.m_positions[i] = c.add((this.m_positions[i]).subtract(c).multiply( 1.0 / maxD)); // c + (p-c)*s
        }
    }

    computeSphericalUV() {

        this.m_UV = [];
        var positionSize = this.m_positions.length;
        for(var i=0; i<positionSize; i++){
            var n = (this.m_positions[i]).toUnitVector();
            var u = Math.atan(n.e(1), n.e(3)) / (2*Math.PI) + 0.5;
            var v = n.e(2) * 0.5 + 0.5;
            this.m_UV[i] = $V([u,v]);
        }
    }

    computeCubeUV(){
        this.m_UV = [];
        var positionSize = this.m_positions.length;
        var invAtan = $V([1.0 / Math.PI, 1.0 / (2.0 * Math.PI)]);
        for(var i=0; i<positionSize; i++){
            var normedPos = this.m_positions[i].toUnitVector();
            var uv = $V([Math.atan2(normedPos.e(3),normedPos.e(1)), Math.asin(normedPos.e(2))]);
            uv = uv.ewMult(invAtan);
            this.m_UV[i] = uv.add($V([0.5,0.5]));
        }
    }

    recomputeNormalsSimple() {

        this.m_normals = [];
        var positionSize = this.m_positions.length;
        for(var i=0; i<positionSize; i++){
            this.m_normals[i] = $V([0,0,0]);
        }

        var trianglesSize = this.m_triangles.length;
        for (var i = 0; i < trianglesSize; i++) {
            //console.log(this.m_triangles[i]);
            var e01 = this.m_positions[this.m_triangles[i].elements[1]].subtract(this.m_positions[this.m_triangles[i].elements[0]]);
            var e02 = this.m_positions[this.m_triangles[i].elements[2]].subtract(this.m_positions[this.m_triangles[i].elements[0]]);
            var n = e01.cross(e02);
            n = n.toUnitVector();

            for(var j = 0; j < 3; j++){
                this.m_normals[this.m_triangles[i].elements[j]] = n.add(this.m_normals[this.m_triangles[i].elements[j]]);
            }
        }

        var normalsSize =  this.m_normals.length;
        for (var i = 0; i <normalsSize; i++){
            this.m_normals[i] = this.m_normals[i].toUnitVector();
        }
    }

    makePlan(scale, res){

        var cpt = 0;
        // Let's generate res * res vertices
        for(var i=0; i<res; i++){
            for(var j=0; j<res; j++){
                // Trust me I'm an engineer, it works.
                var x = -scale + 2.0*scale*i/(res-1.0);
                var z = -scale + 2.0*scale*j/(res-1.0);
                this.m_positions[res*i+j] = $V([x,0,z]);
                this.m_UV[res*i+j] = $V([(x+scale)/(2*scale), (z+scale)/(2*scale)]);
                // We need (res-1)*(res-1)*2 triangles
                if(i<res-1 && j<res-1){
                    this.m_triangles[2*cpt] = $V([res*i+j, res*i+j+1, res*(i+1)+j+1]);
                    this.m_triangles[2*cpt+1] = $V([res*i+j, res*(i+1)+j+1, res*(i+1)+j]);
                    cpt++;
                }
            }
        }

        this.recomputeNormalsSimple();
    }

    makePlan2(scale){

        // FRONT FACE

        // Vertices
        this.m_positions.push($V([-scale,0,-scale]));
        this.m_positions.push($V([-scale,0,scale]));
        this.m_positions.push($V([scale,0,-scale]));
        this.m_positions.push($V([scale,0,scale]));

        // Normals
        this.m_normals.push($V([0,1,0]));
        this.m_normals.push($V([0,1,0]));
        this.m_normals.push($V([0,1,0]));
        this.m_normals.push($V([0,1,0]));

        // UVs
        this.m_UV.push($V([0,0]));
        this.m_UV.push($V([0,1]));
        this.m_UV.push($V([1,0]));
        this.m_UV.push($V([1,1]));

        // Index
        this.m_triangles.push($V([2,0,1]));
        this.m_triangles.push($V([2,1,3]));

        
        // BACK FACE
        
        // Vertices
        this.m_positions.push($V([-scale,-0.03,-scale]));
        this.m_positions.push($V([-scale,-0.03,scale]));
        this.m_positions.push($V([scale,-0.03,-scale]));
        this.m_positions.push($V([scale,-0.03,scale]));

        // Normals
        this.m_normals.push($V([0,-1,0]));
        this.m_normals.push($V([0,-1,0]));
        this.m_normals.push($V([0,-1,0]));
        this.m_normals.push($V([0,-1,0]));

        // UVs
        this.m_UV.push($V([0,0]));
        this.m_UV.push($V([0,1]));
        this.m_UV.push($V([1,0]));
        this.m_UV.push($V([1,1]));
        
        // Index
        this.m_triangles.push($V([5,4,6]));
        this.m_triangles.push($V([7,5,6]));
    }

    makeCube(cubeSize, hasNormals){
        
        this.m_positions = [
        $V([ cubeSize,  cubeSize, -cubeSize]),
        $V([-cubeSize,  cubeSize, -cubeSize]),
        $V([ cubeSize, -cubeSize, -cubeSize]),
        $V([-cubeSize, -cubeSize, -cubeSize]),
        $V([ cubeSize,  cubeSize,  cubeSize]),
        $V([-cubeSize,  cubeSize,  cubeSize]),
        $V([ cubeSize, -cubeSize,  cubeSize]),
        $V([-cubeSize, -cubeSize,  cubeSize])
        ];

        this.m_triangles = [
            $V([0,  2,  1]),      $V([2,  3,  1]),   // front
            $V([4,  5,  6]),      $V([5,  7,  6]),   // back
            $V([4,  0,  5]),      $V([0,  1,  5]),   // top
            $V([6,  7,  2]),      $V([7,  3,  2]),   // bottom
            $V([6,  0,  4]),      $V([6,  2,  0]),   // right
            $V([5,  1,  7]),      $V([1,  3,  7])    // left*/
        ];

        if(hasNormals){
            this.m_normals = [
                $V([ 1,  1, -1]),
                $V([-1,  1, -1]),
                $V([ 1, -1, -1]),
                $V([ 1,  1,  1]),
                $V([-1,  1,  1]),
                $V([ 1, -1,  1]),
                $V([-1, -1, -1]),
                $V([-1, -1,  1])
            ];
        }
    }

    makeQuad(){
        this.m_positions = [
            $V([-1, 1,0]),
            $V([-1,-1,0]),
            $V([ 1, 1,0]),
            $V([ 1,-1,0])
        ];

        this.m_UV = [
            $V([0,1]),
            $V([0,0]),
            $V([1,1]),
            $V([1,0])
        ];

        this.m_triangles = [
            $V([2,0,1]),
            $V([2,1,3])
        ];
    }

    polar2Cartesian (phi, theta, r, pos) {
        pos.x = r * Math.sin (theta) * Math.cos (phi);
        pos.y = r * Math.sin (theta) * Math.sin (phi);
        pos.z = r * Math.cos (theta);
    }

}
