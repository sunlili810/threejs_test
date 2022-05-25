import Stats from 'stats.js';
import * as THREE from 'three/build/three.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
//import { AnimationAction } from 'three/src/animation/AnimationAction';
import { HemisphereLight, PlaneGeometry, Scene, PerspectiveCamera, WebGLRenderer, PlaneBufferGeometry, Mesh, MeshBasicMaterial, DoubleSide, GridHelper, AmbientLight, AnimationMixer, Clock, Raycaster, Vector2, Object3D } from 'three';

export class Soldier {
  private scene: Scene;
  private clock: Clock;
  private camera: PerspectiveCamera;
  private renderer: WebGLRenderer;
  private stats: Stats;
  private gltfLoader: GLTFLoader;
  private walkAction: any;
  private orbitControls: OrbitControls;
  private animationMixer: AnimationMixer;
  // 动画是否暂停
  private paused: boolean = false;
  //private HemisphereLight: HemisphereLight;
  private skeleton;

  constructor() {
    this.scene = new Scene();
    this.clock = new Clock();
    this.camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    this.renderer = new WebGLRenderer({ antialias: true });
    this.gltfLoader = new GLTFLoader();
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.animationMixer = new AnimationMixer(this.scene);
    this.walkAction= null;

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    window.addEventListener('resize', () => this.onWindowResize());

    this.camera.position.set( 1, 2, - 3 );
    this.camera.lookAt( 0, 1, 0 );

				this.scene.background = new THREE.Color( 0xa0a0a0 );
				this.scene.fog = new THREE.Fog( 0xa0a0a0, 10, 50 );


    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
    hemiLight.position.set( 0, 20, 0 );
    this.scene.add( hemiLight );
    const dirLight = new THREE.DirectionalLight( 0xffffff );
      dirLight.position.set( - 3, 10, - 10 );
      dirLight.castShadow = true;
      dirLight.shadow.camera.top = 2;
      dirLight.shadow.camera.bottom = - 2;
      dirLight.shadow.camera.left = - 2;
      dirLight.shadow.camera.right = 2;
      dirLight.shadow.camera.near = 0.1;
      dirLight.shadow.camera.far = 40;
      this.scene.add( dirLight );


    this.stats = new Stats();
    this.stats.showPanel(0);
    window.document.body.appendChild(this.stats.dom);


    // const planeBufferGeometry = new PlaneBufferGeometry(100, 100);
    // const plane = new Mesh(planeBufferGeometry, new MeshBasicMaterial({ color: 0xFFFFFF, side: DoubleSide }));


    const planeBufferGeometry = new PlaneGeometry(100, 100);
    const plane = new Mesh(planeBufferGeometry, new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ));
    plane.name = 'plane';
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    this.scene.add(plane);
   // this.scene.add(new GridHelper(100, 100));网格


    this.gltfLoader.load('../assets/Soldier.glb', gltf => {
      //console.log(gltf);
      // gltf.scene.name = 'Soldier';
      // gltf.scene.rotation.y = Math.PI;
      // this.scene.add(gltf.scene);

      const model = gltf.scene;
      model.name = 'Soldier';
      this.scene.add( model );

      model.traverse( function ( object ) {
//console.log(object);
//if ( object.isMesh ) object.castShadow = true;

      } );

      //

      this.skeleton = new THREE.SkeletonHelper( model );
      this.skeleton.visible = false;
      this.scene.add( this.skeleton );

       //this.scene.add(new AmbientLight(0xFFFFFF, 2));

      this.orbitControls.target.set(0, 1, 0);

      const animationClip:any = gltf.animations.find(animationClip => animationClip.name === 'Walk');
      this.walkAction = this.animationMixer.clipAction(animationClip);
      this.walkAction.play();
    });

    this.renderer.domElement.addEventListener('click', event => {
      const { offsetX, offsetY }  = event;
      const x = ( offsetX / window.innerWidth ) * 2 - 1;
      const y = - ( offsetY / window.innerHeight ) * 2 + 1;
      const mousePoint = new Vector2(x, y);

      const raycaster = new Raycaster();
      // 设置鼠标位置和参考相机
      raycaster.setFromCamera(mousePoint, this.camera);
      // 鼠标点击对应的物体（所有鼠标映射到的物体，包括被遮挡的）
      const intersects =  raycaster.intersectObjects(this.scene.children, true);

      if (intersects.length > 0) {//点击显示自定义div层
        var point=intersects[0].point;
        const tempDom:any = document.getElementById('info');
        tempDom.style.left=this.transPosition(point).x + 'px';
        tempDom.style.top=this.transPosition(point).y + 'px';

      }

      // 过滤网格和地面
      const intersect = intersects.filter(intersect => !(intersect.object instanceof GridHelper) && intersect.object.name !== 'plane')[0];




      if(intersect && this.isClickSoldier(intersect.object)) {
        // 停止动画
        // this.walkAction.stop();
        // 暂停动画
        this.walkAction.paused = !this.walkAction.paused;
      }
    });

    this.render();
  }

  private transPosition(position) {
    let world_vector = new THREE.Vector3(position.x, position.y, position.z);
    let vector = world_vector.project(this.camera);
    let halfWidth = window.innerWidth / 2,
        halfHeight = window.innerHeight / 2;
    return {
        x: Math.round(vector.x * halfWidth + halfWidth),
        y: Math.round(-vector.y * halfHeight + halfHeight)
    };
}

  /**
   * 递归判断是否点击到人物
   * @param object
   */
  private isClickSoldier(object: Object3D) {
    if(object.name === 'Soldier') {
      return object;
    } else if(object.parent) {
      return this.isClickSoldier(object.parent);
    } else {
      return null;
    }
  }



  private render() {
    // 更新动画
    this.animationMixer.update(this.clock.getDelta());

    this.renderer.render(this.scene, this.camera);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    this.scene.background = new THREE.Color( 0xa0a0a0 );
    this.scene.fog = new THREE.Fog( 0xa0a0a0, 10, 50 );

    this.orbitControls.update();
    window.requestAnimationFrame(() => this.render());
    this.stats.update();
  }

  private onWindowResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

}
