import * as THREE from 'three';

// Material Library
class MaterialLibrary {
    constructor() {
        this.materials = {};
        this.initializeMaterials();
    }

    initializeMaterials() {
        // Basic materials
        this.addMaterial('default', new THREE.MeshStandardMaterial({
            color: 0x3498db,
            roughness: 0.7,
            metalness: 0.2
        }));

        this.addMaterial('metal', new THREE.MeshStandardMaterial({
            color: 0xCCCCCC,
            roughness: 0.14,
            metalness: 0.9
        }));

        this.addMaterial('plastic', new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.9,
            metalness: 0.0
        }));

        this.addMaterial('rubber', new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 1.0,
            metalness: 0.0
        }));

        this.addMaterial('glass', new THREE.MeshPhysicalMaterial({
            color: 0xFFFFFF,
            roughness: 0.0,
            metalness: 0.0,
            transmission: 0.9,
            transparent: true,
            opacity: 0.3,
            clearcoat: 1.0,
            clearcoatRoughness: 0.0
        }));

        this.addMaterial('chrome', new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.0,
            metalness: 1.0
        }));

        this.addMaterial('gold', new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            roughness: 0.1,
            metalness: 1.0
        }));

        this.addMaterial('copper', new THREE.MeshStandardMaterial({
            color: 0xB87333,
            roughness: 0.2,
            metalness: 1.0
        }));

        this.addMaterial('wood', new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.0
        }));

        this.addMaterial('concrete', new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.9,
            metalness: 0.0
        }));

        // Add more materials as needed
    }

    addMaterial(name, material) {
        this.materials[name] = material;
    }

    getMaterial(name) {
        if (this.materials[name]) {
            // Return a clone to avoid modifying the template
            return this.materials[name].clone();
        }
        console.warn(`Material '${name}' not found, using default`);
        return this.materials['default'].clone();
    }

    getMaterialNames() {
        return Object.keys(this.materials);
    }

    /**
     * Apply a material to an object by name
     * @param {THREE.Object3D} object - The object to apply the material to
     * @param {string} materialName - The name of the material to apply
     */
    applyMaterial(object, materialName) {
        if (!object) return;
        
        const material = this.getMaterial(materialName);
        
        if (object.material) {
            // Preserve color if the material has one
            if (object.material.color) {
                material.color = object.material.color.clone();
            }
            
            object.material = material;
        }
        
        // Apply to all children as well
        if (object.children && object.children.length > 0) {
            object.children.forEach(child => {
                if (child.material) {
                    // Create a new instance for each child to avoid sharing
                    const childMaterial = material.clone();
                    if (child.material.color) {
                        childMaterial.color = child.material.color.clone();
                    }
                    child.material = childMaterial;
                }
            });
        }
    }
}

export default MaterialLibrary;