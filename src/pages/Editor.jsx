import porta from '../assets/images/porta.png';
import janela from '../assets/images/window.png'; // Caminho corrigido para o arquivo 'window.png'
import sofa from '../assets/images/sofa.png';
import bed from '../assets/images/bed.png'; // Caminho corrigido para o arquivo 'bed.png'
import diningTable from '../assets/images/mesa_jantar.png'; // Caminho corrigido para o arquivo 'mesa_jantar.png'
import poltrona from '../assets/images/poltrona.png';
import banheira from '../assets/images/banheira.png';
import toilet from '../assets/images/vaso_sanitario.png'; // Caminho corrigido para o arquivo 'vaso_sanitario.png'
import lavatory from '../assets/images/lavatorio.png'; // Caminho corrigido para o arquivo 'lavatorio.png'
import sink from '../assets/images/pia.png'; // Caminho corrigido para o arquivo 'pia.png'
import piscina from '../assets/images/piscina.png';

import {
    faSquare,
    faCircle,
    faDoorOpen,
    faWindowMaximize,
    faFont,
    faImage,
    faDrawPolygon,
    faSave,
    faFolderOpen,
    faFileExport,
    faTrashAlt,
    faCouch,
    faBed,
    faChair,
    faToilet,
    faSink,
    faBath,
    faHandsWash,
    faWater,
    faSignOutAlt,
    faFileAlt,
    faChevronUp,
    faChevronDown,
    faCalculator,
} from '@fortawesome/free-solid-svg-icons';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, collection, setDoc, doc, getDocs, deleteDoc, auth } from '../firebase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './Editor.css';

const PIXELS_PER_METER = 40;
const PIXELS_PER_CM = PIXELS_PER_METER / 100;

function createGrid(canvas, width, height, gridSize) {
    const offsetX = ((width % gridSize) / 2);
    const offsetY = ((height % gridSize) / 2);
    const gridObjects = [];

    canvas.forEachObject(obj => {
        if (obj.isGrid) {
            canvas.remove(obj);
        }
    });

    for (let i = 0; i <= Math.floor(width / gridSize); i++) {
        const line = new fabric.Line(
            [i * gridSize + offsetX, 0, i * gridSize + offsetX, height],
            { stroke: '#eee', selectable: false, evented: false, isGrid: true }
        );
        canvas.add(line);
        gridObjects.push(line);
    }
    for (let i = 0; i <= Math.floor(height / gridSize); i++) {
        const line = new fabric.Line(
            [0, i * gridSize + offsetY, width, i * gridSize + offsetY],
            { stroke: '#eee', selectable: false, evented: false, isGrid: true }
        );
        canvas.add(line);
        gridObjects.push(line);
    }
    gridObjects.forEach(obj => canvas.sendToBack(obj));
    canvas.requestRenderAll();
    return gridObjects;
}

export default function Editor() {
    const [canvas, setCanvas] = useState(null);
    const [selectedColor, setSelectedColor] = useState('#D3D3D3');
    const [isDrawingWall, setIsDrawingWall] = useState(false);
    const wallStartRef = useRef(null);
    const fileInputRef = useRef(null);
    const [gridObjects, setGridObjects] = useState([]);
    const [showProjects, setShowProjects] = useState(false);
    const [projects, setProjects] = useState([]);
    const [unit, setUnit] = useState('m');
    const [isLoading, setIsLoading] = useState(false);

    const headerRef = useRef(null);
    const controlsRef = useRef(null);
    const libraryRef = useRef(null);
    const canvasRef = useRef(null);
    const copiedObjectRef = useRef(null);

    const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);

    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                navigate('/');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const isDrawingWallRef = useRef(isDrawingWall);
    const unitRef = useRef(unit);

    useEffect(() => {
        isDrawingWallRef.current = isDrawingWall;
    }, [isDrawingWall]);

    useEffect(() => {
        unitRef.current = unit;
    }, [unit]);

    const toggleLibrary = () => {
        setIsLibraryExpanded(prev => !prev);
    };

    const calculateCanvasDimensions = useCallback(() => {
        const headerHeight = headerRef.current?.offsetHeight || 0;
        const controlsHeight = controlsRef.current?.offsetHeight || 0;
        const libraryHeight = libraryRef.current?.offsetHeight || 0;

        const fixedHeight = headerHeight + controlsHeight + libraryHeight;

        const canvasHeight = window.innerHeight - fixedHeight - 40;
        const canvasWidth = window.innerWidth - 40;

        return {
            width: Math.max(canvasWidth, 300),
            height: Math.max(canvasHeight, 300),
        };
    }, []);

    useEffect(() => {
        const initialDimensions = calculateCanvasDimensions();
        const gridSize = 20;

        const canvasElement = canvasRef.current;
        if (!canvasElement) {
            console.error("CRITICAL ERROR: The <canvas id='canvas'> element was not found.");
            return;
        }

        const c = new fabric.Canvas(canvasElement, {
            width: initialDimensions.width,
            height: initialDimensions.height,
            backgroundColor: 'transparent',
            selection: true,
        });

        setCanvas(c);

        const initialGrid = createGrid(c, initialDimensions.width, initialDimensions.height, gridSize);
        setGridObjects(initialGrid);

        fabric.Object.prototype.toObject = (function (toObject) {
            return function (propertiesToInclude) {
                return toObject.call(this, ['objectType', 'label'].concat(propertiesToInclude || []));
            };
        })(fabric.Object.prototype.toObject);

        const tempLineRef = { current: null };
        const tempTextRef = { current: null };

        const handleMouseDown = (opt) => {
            if (!isDrawingWallRef.current) return;
            const pointer = c.getPointer(opt.e);
            wallStartRef.current = { x: pointer.x, y: pointer.y };
        };

        const handleMouseMove = (opt) => {
            if (!isDrawingWallRef.current || !wallStartRef.current) return;

            const pointer = c.getPointer(opt.e);
            let { x: startX, y: startY } = wallStartRef.current;
            let endX = pointer.x;
            let endY = pointer.y;

            const dx = Math.abs(endX - startX);
            const dy = Math.abs(endY - startY);
            if (dx > dy) {
                endY = startY;
            } else {
                endX = startX;
            }

            if (tempLineRef.current) {
                c.remove(tempLineRef.current);
                tempLineRef.current = null;
            }
            if (tempTextRef.current) {
                c.remove(tempTextRef.current);
                tempTextRef.current = null;
            }

            const tempLine = new fabric.Line([startX, startY, endX, endY], {
                stroke: 'orange',
                strokeWidth: 2,
                selectable: false,
                evented: false,
                strokeDashArray: [5, 5],
            });
            tempLineRef.current = tempLine;
            c.add(tempLine);

            let lengthPx = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            let displayLength;
            let unitLabel;
            if (unitRef.current === 'm') {
                displayLength = (lengthPx / PIXELS_PER_METER).toFixed(2);
                unitLabel = 'm';
            } else {
                displayLength = (lengthPx / PIXELS_PER_CM).toFixed(0);
                unitLabel = 'cm';
            }

            const tempText = new fabric.Text(`${displayLength} ${unitLabel}`, {
                fontSize: 14,
                fill: 'black',
                originX: 'center',
                originY: 'center',
                backgroundColor: 'rgba(245,247,241,0.93)',
                selectable: false,
                evented: false,
                left: (startX + endX) / 2,
                top: (startY + endY) / 2
            });

            tempTextRef.current = tempText;
            c.add(tempText);
            c.requestRenderAll();
        };

        const handleMouseUp = (opt) => {
            if (!isDrawingWallRef.current || !wallStartRef.current) return;

            if (tempLineRef.current) { c.remove(tempLineRef.current); }
            if (tempTextRef.current) { c.remove(tempTextRef.current); }

            const pointer = c.getPointer(opt.e);
            const startX = wallStartRef.current.x;
            const startY = wallStartRef.current.y;
            let endX = pointer.x;
            let endY = pointer.y;

            const dx = Math.abs(endX - startX);
            const dy = Math.abs(endY - startY);
            if (dx > dy) {
                endY = startY;
            } else {
                endX = startX;
            }

            let lengthPx = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            lengthPx = Math.max(1, Math.round(lengthPx));

            const line = new fabric.Line([startX, startY, endX, endY], {
                stroke: 'black',
                strokeWidth: 3,
                selectable: true,
                evented: true,
                objectType: 'wall',
                label: `Parede (${(unitRef.current === 'm' ? (lengthPx / PIXELS_PER_METER).toFixed(2) : (lengthPx / PIXELS_PER_CM).toFixed(0))}${unitRef.current})`
            });
            c.add(line);
            wallStartRef.current = null;
            c.requestRenderAll();
            toast.success('Parede adicionada!');
        };

        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') { return; }
            const activeObject = c.getActiveObject();
            if (activeObject && activeObject.type === 'i-text' && activeObject.isEditing) { return; }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeObjects = c.getActiveObjects();
                if (activeObjects && activeObjects.length > 0) {
                    activeObjects.forEach(obj => { c.remove(obj); });
                    c.discardActiveObject();
                    c.requestRenderAll();
                    toast.success('Objeto(s) deletado(s)!');
                }
                e.preventDefault();
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                if (activeObject && activeObject.type !== 'i-text' && !activeObject.isEditing) {
                    activeObject.clone(clonedObj => {
                        copiedObjectRef.current = clonedObj;
                        toast.success('Objeto copiado!');
                    });
                } else if (!activeObject) {
                    toast.info('Nenhum objeto selecionado para copiar.');
                }
                e.preventDefault();
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                if (copiedObjectRef.current) {
                    copiedObjectRef.current.clone(clonedObj => {
                        clonedObj.set({ left: clonedObj.left + 10, top: clonedObj.top + 10, evented: true, selectable: true });
                        c.add(clonedObj);
                        c.setActiveObject(clonedObj);
                        c.requestRenderAll();
                    });
                    toast.success('Objeto colado!');
                } else {
                    toast.info('Nenhum objeto para colar.');
                }
                e.preventDefault();
            }
        };

        c.on('mouse:down', handleMouseDown);
        c.on('mouse:move', handleMouseMove);
        c.on('mouse:up', handleMouseUp);
        document.addEventListener('keydown', handleKeyDown);

        const resizeObserver = new ResizeObserver(() => {
            const currentDimensions = calculateCanvasDimensions();
            c.setWidth(currentDimensions.width);
            c.setHeight(currentDimensions.height);
            const newGrid = createGrid(c, currentDimensions.width, currentDimensions.height, 20);
            setGridObjects(newGrid);
            c.requestRenderAll();
        });

        if (canvasElement.parentElement) {
            resizeObserver.observe(canvasElement.parentElement);
        }

        return () => {
            c.off('mouse:down', handleMouseDown);
            c.off('mouse:move', handleMouseMove);
            c.off('mouse:up', handleMouseUp);
            document.removeEventListener('keydown', handleKeyDown);
            if (canvasElement.parentElement) {
                resizeObserver.unobserve(canvasElement.parentElement);
            }
            if (c && c.dispose) {
                c.dispose();
            }
        };
    }, [calculateCanvasDimensions]);

    useEffect(() => {
        if (canvas) {
            const currentDimensions = calculateCanvasDimensions();
            canvas.setWidth(currentDimensions.width);
            canvas.setHeight(currentDimensions.height);
            const newGrid = createGrid(canvas, currentDimensions.width, currentDimensions.height, 20);
            setGridObjects(newGrid);
            canvas.requestRenderAll();
        }
    }, [isLibraryExpanded, canvas, calculateCanvasDimensions]);

    const handleSave = async () => {
    if (!canvas || isLoading || !user) {
        toast.error("Canvas não está pronto, carregando ou usuário não logado.");
        return;
    }
    const name = prompt('Nome do projeto:');
    if (!name) {
        toast.info('Salvamento cancelado.');
        return;
    }
    
    // O bloco de código que verificava as imagens Base64 foi removido
    
    setIsLoading(true);

    const currentGridObjects = [...gridObjects];
    currentGridObjects.forEach(obj => canvas.remove(obj));
    canvas.requestRenderAll();

    const json = canvas.toJSON();
    try {
        await setDoc(doc(db, 'projetos', user.uid, 'userProjects', name), { data: json, projectName: name });
        toast.success('Projeto salvo com sucesso!');
    } catch (e) {
        toast.error(`Erro ao salvar no Firebase: ${e.message}`);
        console.error("Erro ao salvar no Firebase:", e);
    } finally {
        const currentWidth = canvas.getWidth();
        const currentHeight = canvas.getHeight();
        const newGrid = createGrid(canvas, currentWidth, currentHeight, 20);
        setGridObjects(newGrid);
        canvas.requestRenderAll();
        setShowProjects(false);
        setIsLoading(false);
    }
};

    const handleShowProjects = async () => {
        if (isLoading || !user) {
            if (!user) toast.error("Por favor, faça login para ver seus projetos.");
            return;
        }
        setIsLoading(true);

        if (!showProjects) {
            try {
                const querySnapshot = await getDocs(collection(db, 'projetos', user.uid, 'userProjects'));
                const loadedProjects = [];
                querySnapshot.forEach((doc) => {
                    loadedProjects.push({ id: doc.id, name: doc.data().projectName || doc.id, data: doc.data().data });
                });
                setProjects(loadedProjects);
                toast.info('Projetos carregados.');
            } catch (error) {
                toast.error(`Erro ao carregar projetos do Firebase: ${error.message}`);
                console.error("Erro ao carregar projetos do Firebase:", error);
            } finally {
                setIsLoading(false);
            }
        }
        setShowProjects(prev => !prev);
    };

    const handleLoadProject = async (projectToLoad) => {
        console.log("handleLoadProject: Starting project load.");
        console.log("handleLoadProject: Current canvas:", canvas);
        console.log("handleLoadProject: Project to load:", projectToLoad);

        if (!canvas || isLoading) {
            const msg = "Canvas is not ready or is loading.";
            console.error("handleLoadProject:", msg);
            toast.error(msg);
            return;
        }
        setIsLoading(true);

        const id = projectToLoad.id;
        const json = projectToLoad.data;

        console.log("handleLoadProject: Project ID:", id);
        console.log("handleLoadProject: Project JSON (first 200 chars):", JSON.stringify(json).substring(0, 200));

        try {
            canvas.clear();
            console.log("handleLoadProject: Canvas cleared.");

            canvas.loadFromJSON(json, () => {
                console.log("handleLoadProject: loadFromJSON callback executed. Project successfully loaded into Fabric.js.");
                const width = canvas.getWidth();
                const height = canvas.getHeight();
                const gridSize = 20;
                const newGrid = createGrid(canvas, width, height, gridSize);
                setGridObjects(newGrid);
                canvas.renderAll();
                toast.success(`Project "${id}" loaded.`);
                setIsLoading(false);
            }, (o, object) => {
                if (object && object.type === 'image' && object.src && !object.crossOrigin) {
                    object.crossOrigin = 'anonymous';
                    console.log(`handleLoadProject: Setting crossOrigin for image: ${object.src}`);
                }
            });
        } catch (error) {
            const msg = `Error loading project: ${error.message}`;
            console.error("handleLoadProject:", msg, error);
            toast.error(msg);
            setIsLoading(false);
        } finally {
            setShowProjects(false);
        }
    };

    const handleDeleteProject = async (projectToDelete) => {
        if (isLoading || !user) return;
        const id = projectToDelete.id;
        if (window.confirm("Are you sure you want to delete this project?")) {
            setIsLoading(true);
            try {
                await deleteDoc(doc(db, 'projetos', user.uid, 'userProjects', id));
                setProjects((prev) => prev.filter((p) => p.id !== id));
                toast.success('Project deleted successfully!');
            } catch (error) {
                toast.error(`Error deleting project: ${error.message}`);
                console.error("Error deleting project:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await signOut(auth);
            toast.info('You have been disconnected.');
            if (canvas) {
                canvas.clear();
                canvas.requestRenderAll();
            }
        } catch (error) {
            toast.error(`Error logging out: ${error.message}`);
            console.error("Logout Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewProject = () => {
        if (isLoading) return;
        if (window.confirm("Do you want to start a new project? Unsaved changes will be lost.")) {
            if (canvas) {
                canvas.clear();
                const currentWidth = canvas.getWidth();
                const currentHeight = canvas.getHeight();
                const newGrid = createGrid(canvas, currentWidth, currentHeight, 20);
                setGridObjects(newGrid);
                canvas.requestRenderAll();
            }
            toast.info('New project started.');
        }
    };

    const addLibraryItem = (type, options = {}, imagePath = null, label = null) => {
        if (!canvas) {
            toast.error("Canvas is not ready. Cannot add item.");
            return;
        }
        setIsDrawingWall(false);
        if (canvas.defaultCursor === 'crosshair') {
            canvas.defaultCursor = 'default';
        }

        const defaultOptions = {
            left: 100,
            top: 100,
            fill: selectedColor,
            selectable: true,
            evented: true,
            objectType: type,
            label: label || type
        };
        const mergedOptions = { ...defaultOptions, ...options };

        if (imagePath) {
            const cacheBusterPath = `${imagePath}?_ts=${new Date().getTime()}`;
            fabric.Image.fromURL(imagePath, (img) => {
        if (img) {
            const defaultScale = 0.15;
            img.set({
                left: mergedOptions.left,
                top: mergedOptions.top,
                scaleX: defaultScale,
                scaleY: defaultScale,
                selectable: true,
                evented: true,
                objectType: mergedOptions.objectType,
                label: mergedOptions.label,
                crossOrigin: 'anonymous'
            });
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.requestRenderAll();
            toast.success(`${label || type} adicionado!`);
        } else {
            console.warn(`Erro ao carregar a imagem: ${imagePath}.`);
            toast.error(`Erro ao carregar a imagem: ${label || type}.`);
        }
    }, { crossOrigin: 'anonymous' });
    return;
        }

        let fabricObject = null;

        switch (type) {
            case 'rectangle':
                fabricObject = new fabric.Rect({ ...mergedOptions, width: 80, height: 85 });
                break;
            case 'circle':
                fabricObject = new fabric.Circle({ ...mergedOptions, radius: 40 });
                break;
            case 'text':
                fabricObject = new fabric.IText('Type here', { ...mergedOptions, fontSize: 20, fill: 'black' });
                break;
            default:
                console.warn('Unrecognized or unsupported component type without an image:', type);
                toast.error(`Unrecognized component type: ${type}`);
                return;
        }

        if (fabricObject) {
            canvas.add(fabricObject);
            canvas.setActiveObject(fabricObject);
            canvas.requestRenderAll();
            toast.success(`${label || type} added!`);
        }
    };

    const addImage = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = null;
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        if (!canvas) {
            toast.error("Canvas is not ready. Cannot upload image.");
            return;
        }
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (f) {
                fabric.Image.fromURL(f.target.result, (img) => {
                    if (img) {
                        img.scale(0.3).set({ left: 150, top: 150, selectable: true, evented: true, objectType: 'uploaded_image', label: 'Uploaded Image', crossOrigin: 'anonymous' });
                        canvas.add(img);
                        canvas.requestRenderAll();
                        toast.success('Image uploaded!');
                    } else {
                        console.warn('Error loading image from file. img object is null.');
                        toast.error('Error loading image from file.');
                    }
                }, { crossOrigin: 'anonymous' });
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleWall = () => {
        setIsDrawingWall((prev) => !prev);
        if (canvas) {
            canvas.discardActiveObject();
            canvas.defaultCursor = !isDrawingWall ? 'crosshair' : 'default';
            canvas.requestRenderAll();
        }
    };

    const handleExport = () => {
        if (!canvas) {
            toast.error("Canvas is not ready to export.");
            return;
        }
        gridObjects.forEach(obj => canvas.remove(obj));
        canvas.requestRenderAll();

        const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
        const link = document.createElement('a');
        link.download = 'planta.png';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Floor plan exported as PNG!');
        gridObjects.forEach(obj => canvas.add(obj));
        canvas.requestRenderAll();
    };

    const handleDelete = () => {
        if (!canvas) {
            toast.error("Canvas is not ready to delete.");
            return;
        }
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            canvas.remove(activeObject);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            toast.info('Object deleted.');
        } else {
            toast.warn('No object selected to delete.');
        }
    };

    return (
        <div className="editor-container">
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
            {isLoading && <div className="loading-overlay">Carregando...</div>}

            <div ref={headerRef} className="header-bar">
                <h1>Editor de Plantas Online</h1>
                <div className="user-info">
                    {user ? (
                        <span>Bem-vindo, {user.email}!</span>
                    ) : (
                        <span>Carregando...</span>
                    )}
                    <button onClick={handleLogout} disabled={isLoading} title="Sair da Conta">
                        <FontAwesomeIcon icon={faSignOutAlt} /> Sair
                    </button>
                    <button onClick={handleNewProject} disabled={isLoading} title="Iniciar Novo Projeto">
                        <FontAwesomeIcon icon={faFileAlt} /> Novo Projeto
                    </button>
                    <a
                        href="https://akira2018.github.io/calc_construtor/"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir Calculadora de Construção"
                    >
                        <button>
                            <FontAwesomeIcon icon={faCalculator} /> Cálculo de Previsão de Custos
                        </button>
                    </a>
                </div>
            </div>

            <div ref={controlsRef} className="controls-bar">
                <div className="tool-group">
                    <label htmlFor="colorPicker">Cor Padrão:</label>
                    <input
                        type="color"
                        id="colorPicker"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        disabled={isLoading}
                        title="Selecionar Cor de Preenchimento"
                    />
                </div>
                <div className="tool-group">
                    <label htmlFor="unitSelect">Unidade:</label>
                    <select
                        id="unitSelect"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        disabled={isLoading}
                        title="Selecionar Unidade de Medida"
                    >
                        <option value="m">Metros (m)</option>
                        <option value="cm">Centímetros (cm)</option>
                    </select>
                </div>

                {/* BOTÕES PRINCIPAIS ADICIONADOS À BARRA DE CONTROLES */}
                <button onClick={() => addLibraryItem('rectangle', {}, null, 'Retângulo')} disabled={isLoading} title="Adicionar Retângulo">
                    <FontAwesomeIcon icon={faSquare} /> Retângulo
                </button>
                <button onClick={() => addLibraryItem('circle', {}, null, 'Círculo')} disabled={isLoading} title="Adicionar Círculo">
                    <FontAwesomeIcon icon={faCircle} /> Círculo
                </button>
                <button onClick={() => addLibraryItem('text', {}, null, 'Texto')} disabled={isLoading} title="Adicionar Texto">
                    <FontAwesomeIcon icon={faFont} /> Texto
                </button>
                <button onClick={addImage} disabled={isLoading} title="Carregar Imagem">
                    <FontAwesomeIcon icon={faImage} /> Upload de Imagem
                </button>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept="image/*" />
                
                <button
                    onClick={toggleWall}
                    className={isDrawingWall ? 'active' : ''}
                    disabled={isLoading}
                    title="Desenhar Parede"
                >
                    <FontAwesomeIcon icon={faDrawPolygon} /> Desenhar Parede
                </button>
                <button onClick={handleSave} disabled={isLoading} title="Salvar Projeto">
                    <FontAwesomeIcon icon={faSave} /> Salvar
                </button>
                <button onClick={handleShowProjects} disabled={isLoading} title="Meus Projetos">
                    <FontAwesomeIcon icon={faFolderOpen} /> Meus Projetos
                </button>
                <button onClick={handleExport} disabled={isLoading} title="Exportar para PNG">
                    <FontAwesomeIcon icon={faFileExport} /> Exportar PNG
                </button>
                <button onClick={handleDelete} disabled={isLoading} title="Deletar Objeto Selecionado">
                    <FontAwesomeIcon icon={faTrashAlt} /> Deletar
                </button>
            </div>

            <div ref={libraryRef} className="library-section">
                <div className="library-header">
                    <h2>Componentes da Biblioteca</h2>
                    <button className="library-toggle-button" onClick={toggleLibrary}>
                        <FontAwesomeIcon icon={isLibraryExpanded ? faChevronUp : faChevronDown} />
                    </button>
                </div>
                <div className={`library-content ${isLibraryExpanded ? '' : 'collapsed'}`}>

                    {/* Grupo de Elementos de Construção */}
                    <div className="library-group">
                        <h4>Elementos de Construção</h4>
                        <div className="library-group-buttons">
                            <button onClick={() => addLibraryItem('door', {}, porta, 'Porta')} disabled={isLoading}>
                                <FontAwesomeIcon icon={faDoorOpen} /> Porta
                            </button>
                            <button onClick={() => addLibraryItem('window', {}, janela, 'Janela')} disabled={isLoading}>
                                <FontAwesomeIcon icon={faWindowMaximize} /> Janela
                            </button>
                        </div>
                    </div>

                    {/* Grupo de Móveis */}
                    <div className="library-group">
                        <h4>Móveis</h4>
                        <div className="library-group-buttons">
                            <button onClick={() => addLibraryItem('sofa', {}, sofa, 'Sofá')} disabled={isLoading}>
                                <FontAwesomeIcon icon={faCouch} /> Sofá
                            </button>
                            <button onClick={() => addLibraryItem('poltrona', {}, poltrona, 'Poltrona')} disabled={isLoading}>
                                <FontAwesomeIcon icon={faChair} /> Poltrona
                            </button>
                            <button onClick={() => addLibraryItem('bed', {}, bed, 'Cama')} disabled={isLoading}>
                                <FontAwesomeIcon icon={faBed} /> Cama
                            </button>
                            <button onClick={() => addLibraryItem('diningTable', {}, diningTable, 'Mesa de Jantar')} disabled={isLoading}>
                                <FontAwesomeIcon icon={faChair} /> Mesa de Jantar
                            </button>
                        </div>
                    </div>

                    {/* Grupo de Banheiro */}
                    <div className="library-group">
                        <h4>Banheiro</h4>
                        <div className="library-group-buttons">
                            <button onClick={() => addLibraryItem('toilet', {}, toilet, 'Vaso Sanitário')} disabled={isLoading}>
                                <FontAwesomeIcon icon={faToilet} /> Vaso Sanitário
                            </button>
                            <button onClick={() => addLibraryItem('lavatory', {}, lavatory, 'Lavatório')} disabled={isLoading}>
                                <FontAwesomeIcon icon={faHandsWash} /> Lavatório
                            </button>
                            <button onClick={() => addLibraryItem('sink', {}, sink, 'Pia')} disabled={isLoading}>
                                <FontAwesomeIcon icon={faSink} /> Pia
                            </button>
                            <button onClick={() => addLibraryItem('banheira', {}, banheira, 'Banheira')} disabled={isLoading}>
                                <FontAwesomeIcon icon={faBath} /> Banheira
                            </button>
                        </div>
                    </div>
                    
                    {/* Grupo de Outros */}
                    <div className="library-group">
                        <h4>Outros</h4>
                        <div className="library-group-buttons">
                            <button onClick={() => addLibraryItem('piscina', {}, piscina, 'Piscina')} disabled={isLoading}>
                                <FontAwesomeIcon icon={faWater} /> Piscina
                            </button>
                        </div>
                    </div>

                </div>
            </div>
            
            <div className="canvas-container">
                <canvas id="canvas" ref={canvasRef}></canvas>
            </div>

            {showProjects && (
                <div className="project-modal-overlay">
                    <div className="project-modal-content">
                        <h2>Meus Projetos</h2>
                        {projects.length > 0 ? (
                            <ul>
                                {projects.map((project) => (
                                    <li key={project.id} className="project-item">
                                        <span>{project.name}</span>
                                        <div>
                                            <button onClick={() => handleLoadProject(project)} disabled={isLoading}>Abrir</button>
                                            <button onClick={() => handleDeleteProject(project)} disabled={isLoading} className="delete-btn">Excluir</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>Você não tem projetos salvos.</p>
                        )}
                        <button onClick={() => setShowProjects(false)} className="project-modal-close-btn">Fechar</button>
                    </div>
                </div>
            )}
        </div>
    );
}