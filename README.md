# WebBlender - 3D Modeling in the Browser

A powerful web-based 3D modeling application inspired by Blender, built with Three.js and modern web technologies.

## Features

- **3D Viewport**: Navigate and manipulate objects in real-time 3D space
- **Primitive Creation**: Create cubes, spheres, cylinders, cones, and torus shapes
- **Transform Tools**: Move, rotate, and scale objects with interactive gizmos
- **Material System**: Apply various materials including metal, glass, plastic, and more
- **Import/Export**: Support for GLTF/GLB model formats
- **Scene Management**: Save and load complete scenes
- **Properties Panel**: Edit object properties, transforms, and materials

## Getting Started

1. Open `index.html` in a modern web browser
2. The application will load with a default scene containing a cube
3. Use the toolbar on the left to create new objects
4. Click on objects to select them and use the properties panel on the right to edit them

## Controls

### Navigation
- **Rotate View**: Left-click + Drag
- **Pan View**: Right-click + Drag  
- **Zoom**: Mouse Wheel

### Object Manipulation
- **Select Object**: Click on an object
- **Translate (Move)**: Press G or click the translate button
- **Rotate**: Press R or click the rotate button
- **Scale**: Press S or click the scale button
- **Delete**: Select an object and press Delete

## File Operations

- **New Scene**: Create a blank scene
- **Save Scene**: Save your work as a .webblender file
- **Load Scene**: Open a previously saved .webblender file
- **Import GLTF**: Import models in GLTF/GLB format
- **Export GLTF**: Export your scene in GLTF format

## Architecture

The application is built using:

- **Three.js**: 3D rendering engine
- **Modern JavaScript**: ES6+ modules with import maps
- **WebGL**: Hardware-accelerated 3D graphics
- **Modular Design**: Separate files for materials, main application logic, and styling

## Browser Support

Requires a modern browser with WebGL support:
- Chrome 80+
- Firefox 70+
- Safari 13+
- Edge 80+

## Development

The application uses ES6 modules and runs directly in the browser without a build step. Simply open `index.html` in a web server or modern browser that supports ES6 modules.

