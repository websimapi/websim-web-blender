import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import MaterialLibrary from './materials.js';

class WebBlender {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.clock = new THREE.Clock();
        this.objects = [];
        this.selectedObject = null;
        this.transformMode = 'translate'; // 'translate', 'rotate', 'scale'
        this.gltfLoader = new GLTFLoader();
        this.materialLibrary = new MaterialLibrary();

        this.init();
        this.setupLights();
        this.setupControls();
        this.setupHelpers();
        this.setupEventListeners();
        this.createDefaultObjects();
        this.setupGUI();
        this.createHelpOverlay();
        this.animate();
    }

    init() {
        // Configure renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x1a1a1a, 1);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;

        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;

        this.scene.add(directionalLight);
    }

    setupControls() {
        // Orbit controls for camera navigation
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;

        // Transform controls for object manipulation
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.orbitControls.enabled = !event.value;
        });
        this.transformControls.addEventListener('objectChange', () => {
            this.updatePropertiesPanel();
        });
        this.scene.add(this.transformControls);
    }

    setupHelpers() {
        // Grid helper
        const gridHelper = new THREE.GridHelper(20, 20, 0x555555, 0x333333);
        this.scene.add(gridHelper);

        // Axes helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
    }

    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Handle keydown events for transform mode switching
        window.addEventListener('keydown', (event) => {
            switch(event.key.toLowerCase()) {
                case 'g':
                    this.setTransformMode('translate');
                    break;
                case 'r':
                    this.setTransformMode('rotate');
                    break;
                case 's':
                    this.setTransformMode('scale');
                    break;
                case 'delete':
                case 'backspace':
                    this.deleteSelectedObject();
                    break;
            }
        });

        // Mouse events for object selection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.renderer.domElement.addEventListener('click', (event) => {
            // Convert mouse position to normalized device coordinates
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.objects, true);

            if (intersects.length > 0) {
                let object = intersects[0].object;
                // Navigate up to the parent that is in our objects array
                while (object.parent && !this.objects.includes(object)) {
                    object = object.parent;
                }

                if (this.objects.includes(object)) {
                    this.selectObject(object);
                }
            } else {
                this.deselectObject();
            }
        });
    }

    createDefaultObjects() {
        // Create a ground plane
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x555555, 
            side: THREE.DoubleSide,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.name = 'Ground';
        this.scene.add(ground);

        // Create default cube
        this.createPrimitive('cube', { size: 1 });
    }

    createPrimitive(type, params = {}) {
        let geometry, material, mesh;

        // Create geometry based on type
        switch(type.toLowerCase()) {
            case 'cube':
                const size = params.size || 1;
                geometry = new THREE.BoxGeometry(size, size, size);
                break;
            case 'sphere':
                const radius = params.radius || 0.5;
                const segments = params.segments || 32;
                geometry = new THREE.SphereGeometry(radius, segments, segments);
                break;
            case 'cylinder':
                const radiusTop = params.radiusTop || 0.5;
                const radiusBottom = params.radiusBottom || 0.5;
                const height = params.height || 1;
                const radialSegments = params.radialSegments || 32;
                geometry = new THREE.CylinderGeometry(
                    radiusTop, radiusBottom, height, radialSegments
                );
                break;
            case 'cone':
                const coneRadius = params.radius || 0.5;
                const coneHeight = params.height || 1;
                const coneSegments = params.segments || 32;
                geometry = new THREE.ConeGeometry(coneRadius, coneHeight, coneSegments);
                break;
            case 'torus':
                const torusRadius = params.radius || 0.5;
                const tubeRadius = params.tubeRadius || 0.2;
                const tubularSegments = params.tubularSegments || 32;
                const radialSegments2 = params.radialSegments || 16;
                geometry = new THREE.TorusGeometry(
                    torusRadius, tubeRadius, radialSegments2, tubularSegments
                );
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 1, 1);
        }

        // Create material
        material = new THREE.MeshStandardMaterial({
            color: params.color || 0x3498db,
            roughness: params.roughness !== undefined ? params.roughness : 0.7,
            metalness: params.metalness !== undefined ? params.metalness : 0.2
        });

        // Create mesh
        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = params.name || type.charAt(0).toUpperCase() + type.slice(1);

        // Set position if provided
        if (params.position) {
            mesh.position.copy(params.position);
        } else {
            // Position slightly above the ground
            mesh.position.y = (type === 'cube') ? 0.5 : 1;
        }

        // Add to scene and objects array
        this.scene.add(mesh);
        this.objects.push(mesh);

        // Select the newly created object
        this.selectObject(mesh);

        return mesh;
    }

    selectObject(object) {
        this.deselectObject();
        this.selectedObject = object;
        this.transformControls.attach(object);
        this.updatePropertiesPanel();
    }

    deselectObject() {
        if (this.selectedObject) {
            this.transformControls.detach();
            this.selectedObject = null;
            this.updatePropertiesPanel();
        }
    }

    deleteSelectedObject() {
        if (this.selectedObject) {
            this.transformControls.detach();
            this.scene.remove(this.selectedObject);

            // Remove from objects array
            const index = this.objects.indexOf(this.selectedObject);
            if (index !== -1) {
                this.objects.splice(index, 1);
            }

            this.selectedObject = null;
            this.updatePropertiesPanel();
        }
    }

    setTransformMode(mode) {
        this.transformMode = mode;
        this.transformControls.setMode(mode);
    }

    setupGUI() {
        // Create toolbar buttons
        this.createToolbarButtons();

        // Initialize properties panel
        this.updatePropertiesPanel();
    }

    createToolbarButtons() {
        const toolbar = document.getElementById('toolbar');

        // Add primitive creation buttons
        this.addToolButton(toolbar, 'Cube', '\ud83d\udce6', () => this.createPrimitive('cube'));
        this.addToolButton(toolbar, 'Sphere', '\ud83d\udd35', () => this.createPrimitive('sphere'));
        this.addToolButton(toolbar, 'Cylinder', '\ud83e\uddea', () => this.createPrimitive('cylinder'));
        this.addToolButton(toolbar, 'Cone', '\ud83d\udd3a', () => this.createPrimitive('cone'));
        this.addToolButton(toolbar, 'Torus', '\u2b55', () => this.createPrimitive('torus'));

        toolbar.appendChild(document.createElement('hr'));

        // Add transform mode buttons
        this.addToolButton(toolbar, 'Translate (G)', '\u2195\ufe0f', () => this.setTransformMode('translate'));
        this.addToolButton(toolbar, 'Rotate (R)', '\ud83d\udd04', () => this.setTransformMode('rotate'));
        this.addToolButton(toolbar, 'Scale (S)', '\u26f6', () => this.setTransformMode('scale'));

        toolbar.appendChild(document.createElement('hr'));

        // Add file operation buttons
        this.addToolButton(toolbar, 'New Scene', '\ud83d\udcc4', () => this.newScene());
        this.addToolButton(toolbar, 'Save Scene', '\ud83d\udcbe', () => this.saveScene());
        this.addToolButton(toolbar, 'Load Scene', '\ud83d\udcc2', () => this.loadScene());

        toolbar.appendChild(document.createElement('hr'));

        // Add import/export buttons
        this.addToolButton(toolbar, 'Import GLTF', '\ud83d\udce5', () => this.importModel());
        this.addToolButton(toolbar, 'Export GLTF', '\ud83d\udce4', () => this.exportScene());

        toolbar.appendChild(document.createElement('hr'));

        // Add utility buttons
        this.addToolButton(toolbar, 'Delete (Del)', '\ud83d\uddd1\ufe0f', () => this.deleteSelectedObject());
        this.addToolButton(toolbar, 'Help', '\u2753', () => this.toggleHelpOverlay());
    }

    addToolButton(parent, title, icon, onClick) {
        const button = document.createElement('button');
        button.className = 'tool-button';
        button.title = title;
        button.textContent = icon;
        button.addEventListener('click', onClick);
        parent.appendChild(button);
        return button;
    }

    updatePropertiesPanel() {
        const panel = document.getElementById('properties-panel');
        panel.innerHTML = '';

        if (!this.selectedObject) {
            panel.innerHTML = '<div class="panel-section"><h3>No Object Selected</h3></div>';
            return;
        }

        // Object name section
        const nameSection = document.createElement('div');
        nameSection.className = 'panel-section';
        nameSection.innerHTML = `<h3>Object</h3>`;

        const nameRow = document.createElement('div');
        nameRow.className = 'property-row';
        nameRow.innerHTML = `
            <span class="property-label">Name:</span>
            <input type="text" class="property-input" value="${this.selectedObject.name}">
        `;
        nameSection.appendChild(nameRow);

        // Get the input element and add change event listener
        const nameInput = nameRow.querySelector('input');
        nameInput.addEventListener('change', () => {
            this.selectedObject.name = nameInput.value;
        });

        panel.appendChild(nameSection);

        // Transform section
        const transformSection = document.createElement('div');
        transformSection.className = 'panel-section';
        transformSection.innerHTML = `<h3>Transform</h3>`;

        // Position controls
        this.addVector3Controls(transformSection, 'Position', this.selectedObject.position);

        // Rotation controls (convert from radians to degrees for UI)
        const rotation = new THREE.Vector3(
            THREE.MathUtils.radToDeg(this.selectedObject.rotation.x),
            THREE.MathUtils.radToDeg(this.selectedObject.rotation.y),
            THREE.MathUtils.radToDeg(this.selectedObject.rotation.z)
        );
        this.addVector3Controls(transformSection, 'Rotation', rotation, (prop, value) => {
            this.selectedObject.rotation[prop] = THREE.MathUtils.degToRad(value);
        });

        // Scale controls
        this.addVector3Controls(transformSection, 'Scale', this.selectedObject.scale);

        panel.appendChild(transformSection);

        // Material section
        const materialSection = document.createElement('div');
        materialSection.className = 'panel-section';
        materialSection.innerHTML = `<h3>Material</h3>`;

        // Material preset selector
        const materialRow = document.createElement('div');
        materialRow.className = 'property-row';
        materialRow.innerHTML = `
            <span class="property-label">Preset:</span>
            <select class="property-input">
                <option value="">Custom</option>
                ${this.materialLibrary.getMaterialNames().map(name => 
                    `<option value="${name}">${name.charAt(0).toUpperCase() + name.slice(1)}</option>`
                ).join('')}
            </select>
        `;
        materialSection.appendChild(materialRow);

        // Get the select element and add change event listener
        const materialSelect = materialRow.querySelector('select');
        materialSelect.addEventListener('change', () => {
            if (materialSelect.value) {
                this.materialLibrary.applyMaterial(this.selectedObject, materialSelect.value);
                this.updatePropertiesPanel(); // Refresh the panel to show the new material properties
            }
        });

        // Color control
        const material = this.selectedObject.material;
        if (material) {
            const colorRow = document.createElement('div');
            colorRow.className = 'property-row';
            colorRow.innerHTML = `
                <span class="property-label">Color:</span>
                <input type="color" class="property-input" value="#${material.color.getHexString()}">
            `;
            materialSection.appendChild(colorRow);

            // Get the input element and add change event listener
            const colorInput = colorRow.querySelector('input');
            colorInput.addEventListener('change', () => {
                material.color.set(colorInput.value);
            });

            // Roughness control
            if (material.roughness !== undefined) {
                this.addSliderControl(materialSection, 'Roughness', material.roughness, 0, 1, 0.01, (value) => {
                    material.roughness = value;
                });
            }

            // Metalness control
            if (material.metalness !== undefined) {
                this.addSliderControl(materialSection, 'Metalness', material.metalness, 0, 1, 0.01, (value) => {
                    material.metalness = value;
                });
            }

            // Additional properties for physical materials
            if (material.transmission !== undefined) {
                this.addSliderControl(materialSection, 'Transmission', material.transmission, 0, 1, 0.01, (value) => {
                    material.transmission = value;
                    // Update transparency settings based on transmission
                    material.transparent = value > 0;
                    material.opacity = 1 - value * 0.7;
                });
            }

            if (material.clearcoat !== undefined) {
                this.addSliderControl(materialSection, 'Clearcoat', material.clearcoat, 0, 1, 0.01, (value) => {
                    material.clearcoat = value;
                });
            }
        }

        panel.appendChild(materialSection);
    }

    addVector3Controls(parent, label, vector, onChange) {
        const container = document.createElement('div');
        container.innerHTML = `<div class="property-row"><span class="property-label">${label}:</span></div>`;
        parent.appendChild(container);

        ['x', 'y', 'z'].forEach(axis => {
            const row = document.createElement('div');
            row.className = 'property-row';
            row.innerHTML = `
                <span class="property-label" style="padding-left: 15px">${axis.toUpperCase()}:</span>
                <input type="number" class="property-input" value="${vector[axis]}" step="0.1">
            `;
            container.appendChild(row);

            // Get the input element and add change event listener
            const input = row.querySelector('input');
            input.addEventListener('change', () => {
                const value = parseFloat(input.value);
                if (onChange) {
                    onChange(axis, value);
                } else {
                    vector[axis] = value;
                }
            });
        });
    }

    addSliderControl(parent, label, value, min, max, step, onChange) {
        const row = document.createElement('div');
        row.className = 'property-row';
        row.innerHTML = `
            <span class="property-label">${label}:</span>
            <input type="range" class="property-input" value="${value}" min="${min}" max="${max}" step="${step}">
            <span style="width: 40px; text-align: right; margin-left: 5px;">${value.toFixed(2)}</span>
        `;
        parent.appendChild(row);

        // Get the input element and add change event listener
        const input = row.querySelector('input');
        const valueDisplay = row.querySelector('span:last-child');

        input.addEventListener('input', () => {
            const newValue = parseFloat(input.value);
            valueDisplay.textContent = newValue.toFixed(2);
            onChange(newValue);
        });
    }

    exportScene() {
        const exporter = new GLTFExporter();

        // Clone the scene to remove helpers and controls
        const exportScene = this.scene.clone();

        // Remove helpers and controls from the cloned scene
        exportScene.children = exportScene.children.filter(obj => {
            return !(obj instanceof THREE.GridHelper || 
                    obj instanceof THREE.AxesHelper || 
                    obj instanceof THREE.TransformControls);
        });

        // Export the scene
        exporter.parse(exportScene, (gltf) => {
            // Create a blob with the GLTF data
            const blob = new Blob([JSON.stringify(gltf)], { type: 'application/octet-stream' });

            // Create a download link and trigger the download
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'scene.gltf';
            link.click();

            // Clean up
            URL.revokeObjectURL(link.href);
        }, { binary: false });
    }

    importModel() {
        // Create a file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.gltf,.glb';
        input.style.display = 'none';
        document.body.appendChild(input);

        // Handle file selection
        input.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const contents = e.target.result;

                // Load the model
                const url = URL.createObjectURL(file);
                this.gltfLoader.load(url, (gltf) => {
                    const model = gltf.scene;

                    // Position the model at the center of the scene
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());

                    // Reset position to center
                    model.position.set(0, size.y / 2, 0);
                    model.position.sub(center);

                    // Add the model to the scene
                    this.scene.add(model);

                    // Add the model and its children to the objects array
                    this.objects.push(model);

                    // Select the imported model
                    this.selectObject(model);

                    // Clean up
                    URL.revokeObjectURL(url);
                }, undefined, (error) => {
                    console.error('Error loading model:', error);
                });
            };

            // Read the file
            if (file.name.endsWith('.glb')) {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsText(file);
            }

            // Clean up
            document.body.removeChild(input);
        });

        // Trigger file selection dialog
        input.click();
    }

    newScene() {
        if (confirm('Create a new scene? All unsaved changes will be lost.')) {
            // Remove all objects except helpers
            this.objects.forEach(obj => {
                this.scene.remove(obj);
            });

            // Clear objects array
            this.objects = [];

            // Deselect current object
            this.deselectObject();

            // Create default objects
            this.createDefaultObjects();
        }
    }

    saveScene() {
        // Create a scene representation
        const sceneData = {
            objects: this.objects.map(obj => {
                // Get basic object properties
                const data = {
                    type: this.getObjectType(obj),
                    name: obj.name,
                    position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
                    rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
                    scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
                };

                // Add material properties if available
                if (obj.material) {
                    data.material = {
                        color: obj.material.color ? '#' + obj.material.color.getHexString() : '#ffffff',
                        roughness: obj.material.roughness !== undefined ? obj.material.roughness : 0.5,
                        metalness: obj.material.metalness !== undefined ? obj.material.metalness : 0.0,
                    };
                }

                return data;
            }),
            camera: {
                position: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
                rotation: { x: this.camera.rotation.x, y: this.camera.rotation.y, z: this.camera.rotation.z },
            }
        };

        // Convert to JSON
        const json = JSON.stringify(sceneData, null, 2);

        // Create a blob and download
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'scene.webblender';
        link.click();

        // Clean up
        URL.revokeObjectURL(url);
    }

    loadScene() {
        // Create a file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.webblender,.json';
        input.style.display = 'none';
        document.body.appendChild(input);

        // Handle file selection
        input.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const sceneData = JSON.parse(e.target.result);

                    // Clear the current scene
                    this.newScene();

                    // Remove the default objects created by newScene
                    this.objects.forEach(obj => {
                        this.scene.remove(obj);
                    });
                    this.objects = [];

                    // Load the objects from the scene data
                    sceneData.objects.forEach(objData => {
                        // Create the object based on its type
                        if (objData.type === 'cube' || objData.type === 'sphere' || 
                            objData.type === 'cylinder' || objData.type === 'cone' || 
                            objData.type === 'torus') {

                            // Create a new primitive
                            const obj = this.createPrimitive(objData.type, {
                                name: objData.name,
                                position: new THREE.Vector3(objData.position.x, objData.position.y, objData.position.z),
                                color: objData.material ? objData.material.color : undefined,
                                roughness: objData.material ? objData.material.roughness : undefined,
                                metalness: objData.material ? objData.material.metalness : undefined
                            });

                            // Set rotation and scale
                            obj.rotation.set(objData.rotation.x, objData.rotation.y, objData.rotation.z);
                            obj.scale.set(objData.scale.x, objData.scale.y, objData.scale.z);
                        }
                    });

                    // Set camera position if available
                    if (sceneData.camera) {
                        this.camera.position.set(
                            sceneData.camera.position.x,
                            sceneData.camera.position.y,
                            sceneData.camera.position.z
                        );

                        if (sceneData.camera.rotation) {
                            this.camera.rotation.set(
                                sceneData.camera.rotation.x,
                                sceneData.camera.rotation.y,
                                sceneData.camera.rotation.z
                            );
                        }

                        // Update orbit controls target
                        this.orbitControls.target.set(0, 0, 0);
                        this.orbitControls.update();
                    }

                } catch (error) {
                    console.error('Error loading scene:', error);
                    alert('Error loading scene file. The file may be corrupted or in an invalid format.');
                }
            };
            // Read the file as text
            reader.readAsText(file);

            // Clean up
            document.body.removeChild(input);
        });

        // Trigger file selection dialog
        input.click();
    }

    getObjectType(obj) {
        // Get the type of the object based on its geometry
        if (!obj.geometry) return 'unknown';

        if (obj.geometry instanceof THREE.BoxGeometry) return 'cube';
        if (obj.geometry instanceof THREE.SphereGeometry) return 'sphere';
        if (obj.geometry instanceof THREE.CylinderGeometry) {
            if (obj.geometry.parameters.radiusTop === 0) return 'cone';
            return 'cylinder';
        }
        if (obj.geometry instanceof THREE.TorusGeometry) return 'torus';

        return 'unknown';
    }

    createHelpOverlay() {
        // Create help overlay element
        const overlay = document.createElement('div');
        overlay.id = 'help-overlay';
        overlay.className = 'help-overlay';
        overlay.style.display = 'none';

        overlay.innerHTML = `
            <div class="help-content">
                <h2>WebBlender - Quick Help</h2>

                <h3>Navigation</h3>
                <ul>
                    <li><strong>Rotate View:</strong> Left-click + Drag</li>
                    <li><strong>Pan View:</strong> Right-click + Drag</li>
                    <li><strong>Zoom:</strong> Mouse Wheel</li>
                </ul>

                <h3>Object Creation</h3>
                <ul>
                    <li>Click on the primitive buttons in the toolbar to create objects</li>
                </ul>

                <h3>Selection & Manipulation</h3>
                <ul>
                    <li><strong>Select Object:</strong> Click on an object</li>
                    <li><strong>Translate (Move):</strong> Press G or click the translate button</li>
                    <li><strong>Rotate:</strong> Press R or click the rotate button</li>
                    <li><strong>Scale:</strong> Press S or click the scale button</li>
                    <li><strong>Delete:</strong> Select an object and press Delete</li>
                </ul>

                <h3>Properties Panel</h3>
                <ul>
                    <li>When an object is selected, edit its properties in the right panel</li>
                    <li>Change name, transform, material properties, etc.</li>
                </ul>

                <h3>File Operations</h3>
                <ul>
                    <li><strong>New Scene:</strong> Create a blank scene</li>
                    <li><strong>Save Scene:</strong> Save your work as a .webblender file</li>
                    <li><strong>Load Scene:</strong> Open a previously saved .webblender file</li>
                    <li><strong>Import GLTF:</strong> Import models in GLTF/GLB format</li>
                    <li><strong>Export GLTF:</strong> Export your scene in GLTF format</li>
                </ul>

                <button id="close-help">Close Help</button>
            </div>
        ";

        document.body.appendChild(overlay);

        // Add event listener to close button
        document.getElementById('close-help').addEventListener('click', () => {
            this.toggleHelpOverlay();
        });

        // Show help on first load
        setTimeout(() => {
            this.toggleHelpOverlay();
        }, 1000);
    }

    toggleHelpOverlay() {
        const overlay = document.getElementById('help-overlay');
        if (overlay) {
            if (overlay.style.display === 'none') {
                overlay.style.display = 'flex';
            } else {
                overlay.style.display = 'none';
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update controls
        this.orbitControls.update();

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const app = new WebBlender();
    window.webBlender = app; // Make accessible from console for debugging
});