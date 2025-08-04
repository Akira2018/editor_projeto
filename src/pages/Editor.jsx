import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, collection, setDoc, doc, getDocs, deleteDoc, auth } from '../firebase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Importe os ícones do Font Awesome, incluindo os novos para o toggle da biblioteca
import {
    faSquare, faCircle, faDoorOpen, faWindowMaximize, faFont, faImage, faDrawPolygon, faSave, faFolderOpen, faFileExport, faTrashAlt,
    faCouch, faBed, faChair, faToilet, faSink, faBath, faHandsWash,
    faSignOutAlt, faFileAlt, faChevronUp, faChevronDown, faCalculator // <- Adicione faCalculator aqui
} from '@fortawesome/free-solid-svg-icons';

import './Editor.css'; // Importe seu arquivo CSS

// Defina sua escala aqui. Ajustado para 40 pixels = 1 metro para consistência com as melhorias.
const PIXELS_PER_METER = 40;
const PIXELS_PER_CM = PIXELS_PER_METER / 100;

// Função para criar a grade
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
    const canvasRef = useRef(null); // Ref para o elemento <canvas>
    const libraryContentRef = useRef(null); // Ref para o conteúdo da biblioteca
    const copiedObjectRef = useRef(null); // Para armazenar o objeto copiado

    const [isLibraryExpanded, setIsLibraryExpanded] = useState(true); // Novo estado para a biblioteca

    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    // Monitora o estado de autenticação
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                navigate('/');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    // Refs para os valores de estado dentro do useEffect de inicialização do canvas
    const isDrawingWallRef = useRef(isDrawingWall);
    const unitRef = useRef(unit);

    useEffect(() => {
        isDrawingWallRef.current = isDrawingWall;
    }, [isDrawingWall]);

    useEffect(() => {
        unitRef.current = unit;
    }, [unit]);

    // Função para expandir/recolher a biblioteca
    const toggleLibrary = () => {
        setIsLibraryExpanded(prev => !prev);
    };

    // Função para calcular as dimensões do canvas
    const calculateCanvasDimensions = useCallback(() => {
        // Use canvasRef.current para obter o elemento canvas
        if (!canvasRef.current || !headerRef.current || !controlsRef.current || !libraryContentRef.current) {
            return { width: 800, height: 600 }; // Fallback
        }

        const headerHeight = headerRef.current.offsetHeight;
        const controlsHeight = controlsRef.current.offsetHeight;
        // Obtém a altura do library-section, que inclui o header e o content da biblioteca
        const librarySectionHeight = document.querySelector('.library-section')?.offsetHeight || 0;

        const fixedBarsHeight = headerHeight + controlsHeight + librarySectionHeight;
        // Subtrai 40px para as margens do canvas (20px top + 20px bottom)
        const availableHeight = window.innerHeight - fixedBarsHeight - 40;
        // Subtrai 40px para as margens laterais do canvas (20px left + 20px right)
        const availableWidth = window.innerWidth - 40;

        return {
            width: Math.max(availableWidth, 300), // Garante uma largura mínima
            height: Math.max(availableHeight, 300), // Garante uma altura mínima
        };
    }, []); // Não depende de showLibrary diretamente aqui, pois librarySectionHeight já reflete o estado

    // --- REFACTORING CRÍTICO: CONSOLIDAR INICIALIZAÇÃO E EVENTOS DO CANVAS ---
    useEffect(() => {
        const initialDimensions = calculateCanvasDimensions();
        const gridSize = 20;

        const canvasElement = canvasRef.current;
        if (!canvasElement) {
            console.error("ERRO CRÍTICO: Elemento <canvas id='canvas'> não encontrado no DOM. O Fabric.js não pode ser inicializado.");
            return;
        }

        const c = new fabric.Canvas(canvasElement, {
            width: initialDimensions.width,
            height: initialDimensions.height,
            backgroundColor: 'transparent',
            selection: true,
        });

        setCanvas(c); // Define o objeto canvas no estado React

        const initialGrid = createGrid(c, initialDimensions.width, initialDimensions.height, gridSize);
        setGridObjects(initialGrid);

        // Modifica o protótipo para serializar propriedades personalizadas
        fabric.Object.prototype.toObject = (function (toObject) {
            return function (propertiesToInclude) {
                return toObject.call(this, ['objectType', 'label'].concat(propertiesToInclude || []));
            };
        })(fabric.Object.prototype.toObject);

        // --- Eventos do Canvas (Mouse para Desenho de Parede) ---
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

            if (tempLineRef.current) {
                c.remove(tempLineRef.current);
                tempLineRef.current = null;
            }
            if (tempTextRef.current) {
                c.remove(tempTextRef.current);
                tempTextRef.current = null;
            }

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

        // --- Eventos de Teclado (Delete, Copy, Paste) ---
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const activeObject = c.getActiveObject();
            if (activeObject && activeObject.type === 'i-text' && activeObject.isEditing) {
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeObjects = c.getActiveObjects();
                if (activeObjects && activeObjects.length > 0) {
                    activeObjects.forEach(obj => {
                        c.remove(obj);
                    });
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
                        clonedObj.set({
                            left: clonedObj.left + 10,
                            top: clonedObj.top + 10,
                            evented: true,
                            selectable: true
                        });
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

        // ResizeObserver para o pai do canvas
        const resizeObserver = new ResizeObserver(() => {
            const currentDimensions = calculateCanvasDimensions();
            c.setWidth(currentDimensions.width);
            c.setHeight(currentDimensions.height);
            const newGrid = createGrid(c, currentDimensions.width, currentDimensions.height, gridSize);
            setGridObjects(newGrid);
            c.requestRenderAll();
        });

        // Observa o elemento pai do canvas para redimensionamento
        if (canvasElement.parentElement) {
            resizeObserver.observe(canvasElement.parentElement);
        }

        // Função de limpeza
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

    // Efeito para ajustar dimensões quando a biblioteca é expandida/recolhida
    useEffect(() => {
        if (canvas) {
            const currentDimensions = calculateCanvasDimensions();
            canvas.setWidth(currentDimensions.width);
            canvas.setHeight(currentDimensions.height);
            const gridSize = 20;
            const newGrid = createGrid(canvas, currentDimensions.width, currentDimensions.height, gridSize);
            setGridObjects(newGrid);
            canvas.requestRenderAll();
        }
    }, [isLibraryExpanded, canvas, calculateCanvasDimensions]);


    // --- FUNÇÕES DE MANIPULAÇÃO DO FIREBASE ---
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

        // --- NOVO: Verificação de imagens em base64 antes de salvar ---
        const objects = canvas.getObjects();
        const hasBase64Image = objects.some(obj =>
            obj.type === 'image' && obj.getSrc().startsWith('data:image')
        );

        if (hasBase64Image) {
            toast.error(
                "Não é possível salvar projetos com imagens personalizadas (carregadas do seu computador) diretamente no banco de dados devido a limitações de tamanho (1MB por documento). Por favor, remova as imagens personalizadas ou use apenas as da biblioteca. Para salvar imagens personalizadas, seria necessário integrar um serviço de armazenamento de arquivos (como Firebase Storage)."
            );
            return; // Impede o salvamento
        }
        // --- FIM DA VERIFICAÇÃO ---

        setIsLoading(true);

        // Remover grade antes de salvar para não ser parte do JSON do projeto
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
            const gridSize = 20;
            const newGrid = createGrid(canvas, currentWidth, currentHeight, gridSize);
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
        console.log("handleLoadProject: Iniciando carregamento do projeto.");
        console.log("handleLoadProject: Canvas atual:", canvas);
        console.log("handleLoadProject: Projeto a carregar:", projectToLoad);

        if (!canvas || isLoading) {
            const msg = "Canvas não está pronto ou carregando.";
            console.error("handleLoadProject:", msg);
            toast.error(msg);
            return;
        }
        setIsLoading(true);

        const id = projectToLoad.id;
        const json = projectToLoad.data;

        console.log("handleLoadProject: ID do projeto:", id);
        console.log("handleLoadProject: JSON do projeto (primeiros 200 chars):", JSON.stringify(json).substring(0, 200));

        try {
            canvas.clear();
            console.log("handleLoadProject: Canvas limpo.");

            canvas.loadFromJSON(json, () => {
                console.log("handleLoadProject: loadFromJSON callback executado. Projeto carregado com sucesso no Fabric.js.");
                const width = canvas.getWidth();
                const height = canvas.getHeight();
                const gridSize = 20;
                const newGrid = createGrid(canvas, width, height, gridSize);
                setGridObjects(newGrid);
                canvas.renderAll();
                toast.success(`Projeto "${id}" carregado.`);
                setIsLoading(false);
            }, (o, object) => {
                if (object && object.type === 'image' && object.src && !object.crossOrigin) {
                    object.crossOrigin = 'anonymous';
                    console.log(`handleLoadProject: Definindo crossOrigin para imagem: ${object.src}`);
                }
            });
        } catch (error) {
            const msg = `Erro ao carregar projeto: ${error.message}`;
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
        if (window.confirm("Tem certeza que deseja excluir este projeto?")) {
            setIsLoading(true);
            try {
                await deleteDoc(doc(db, 'projetos', user.uid, 'userProjects', id));
                setProjects((prev) => prev.filter((p) => p.id !== id));
                toast.success('Projeto excluído com sucesso!');
            } catch (error) {
                toast.error(`Erro ao excluir projeto: ${error.message}`);
                console.error("Erro ao excluir projeto:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await signOut(auth);
            toast.info('Você foi desconectado.');
            if (canvas) {
                canvas.clear();
                canvas.requestRenderAll();
            }
        } catch (error) {
            toast.error(`Erro ao fazer logout: ${error.message}`);
            console.error("Erro de Logout:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewProject = () => {
        if (isLoading) return;
        if (window.confirm("Deseja iniciar um novo projeto? As alterações não salvas serão perdidas.")) {
            if (canvas) {
                canvas.clear();
                const currentWidth = canvas.getWidth();
                const currentHeight = canvas.getHeight();
                const gridSize = 20;
                const newGrid = createGrid(canvas, currentWidth, currentHeight, gridSize);
                setGridObjects(newGrid);
                canvas.requestRenderAll();
            }
            toast.info('Novo projeto iniciado.');
        }
    };

    // --- FUNÇÕES DA BIBLIOTECA DE COMPONENTES E ADIÇÃO DE FORMAS ---
    const addLibraryItem = (type, options = {}, imagePath = null, label = null) => {
        if (!canvas) {
            toast.error("Canvas não está pronto. Não é possível adicionar item.");
            return;
        }
        setIsDrawingWall(false); // Desativa o modo de desenho de parede ao adicionar item
        if (canvas.defaultCursor === 'crosshair') {
            canvas.defaultCursor = 'default';
        }

        const defaultOptions = {
            left: 100,
            top: 100,
            fill: selectedColor,
            selectable: true,
            evented: true,
            objectType: type, // Adiciona objectType para serialização
            label: label || type // Adiciona label para serialização
        };
        const mergedOptions = { ...defaultOptions, ...options };

        if (imagePath) {
            const cacheBusterPath = `${imagePath}?_ts=${new Date().getTime()}`;
            fabric.Image.fromURL(cacheBusterPath, (img) => {
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
                    console.warn(`Erro ao carregar imagem: ${imagePath}. Objeto img é nulo.`);
                    toast.error(`Erro ao carregar imagem: ${label || type}. Verifique o caminho.`);
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
                fabricObject = new fabric.IText('Digite aqui', { ...mergedOptions, fontSize: 20, fill: 'black' });
                break;
            default:
                console.warn('Tipo de componente não reconhecido ou não suportado sem imagem:', type);
                toast.error(`Tipo de componente não reconhecido: ${type}`);
                return;
        }

        if (fabricObject) {
            canvas.add(fabricObject);
            canvas.setActiveObject(fabricObject);
            canvas.requestRenderAll();
            toast.success(`${label || type} adicionado!`);
        }
    };

    // Funções de atalho para adicionar formas e imagens da biblioteca
    const addRectangle = () => addLibraryItem('rectangle', {}, null, 'Retângulo');
    const addCircle = () => addLibraryItem('circle', {}, null, 'Círculo');
    const addDoor = () => addLibraryItem('door', {}, '/images/porta.png', 'Porta');
    const addWindow = () => addLibraryItem('window', {}, '/images/janela.png', 'Janela');
    const addText = () => addLibraryItem('text', {}, null, 'Texto');
    const addSofa = () => addLibraryItem('sofa', {}, '/images/sofa.png', 'Sofá');
    const addBed = () => addLibraryItem('bed', {}, '/images/bed.png', 'Cama');
    const addDiningTable = () => addLibraryItem('diningTable', {}, '/images/dining_table.png', 'Mesa de Jantar');
    const addToilet = () => addLibraryItem('toilet', {}, '/images/toilet.png', 'Vaso Sanitário');
    const addSink = () => addLibraryItem('sink', {}, '/images/sink.png', 'Pia');
    const addBathtub = () => addLibraryItem('bathtub', {}, '/images/bathtub.png', 'Banheira');
    const addLavatory = () => addLibraryItem('lavatory', {}, '/images/lavatory.png', 'Lavatório');
    const addPoltrona = () => addLibraryItem('poltrona', {}, '/images/poltrona.png', 'Poltrona');
    const addPiscina = () => addLibraryItem('piscina', {}, '/images/piscina.png', 'Piscina');


    const addImage = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = null;
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        if (!canvas) {
            toast.error("Canvas não está pronto. Não é possível carregar imagem.");
            return;
        }
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (f) {
                fabric.Image.fromURL(f.target.result, (img) => {
                    if (img) {
                        img.scale(0.3).set({ left: 150, top: 150, selectable: true, evented: true, objectType: 'uploaded_image', label: 'Imagem Uploaded', crossOrigin: 'anonymous' });
                        canvas.add(img);
                        canvas.requestRenderAll();
                        toast.success('Imagem carregada!');
                    } else {
                        console.warn('Erro ao carregar imagem do arquivo. Objeto img é nulo.');
                        toast.error('Erro ao carregar imagem do arquivo.');
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
            toast.error("Canvas não está pronto para exportar.");
            return;
        }
        // Remove a grade temporariamente antes de exportar
        gridObjects.forEach(obj => canvas.remove(obj));
        canvas.requestRenderAll();

        const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
        const link = document.createElement('a');
        link.download = 'planta.png';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Planta exportada como PNG!');
        // Adiciona a grade de volta
        gridObjects.forEach(obj => canvas.add(obj));
        canvas.requestRenderAll();
    };

    const handleDelete = () => {
        if (!canvas) {
            toast.error("Canvas não está pronto para deletar.");
            return;
        }
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            canvas.remove(activeObject);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            toast.info('Objeto deletado.');
        } else {
            toast.warn('Nenhum objeto selecionado para deletar.');
        }
    };

    return (
        <div className="editor-container">
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
            {isLoading && <div className="loading-overlay">Carregando...</div>}

            <div ref={headerRef} className="header-bar">
                <h1>Editor de Plantas Online</h1>
                {user ? (
                    <span className="user-info">Bem-vindo, {user.email}!
                        <button onClick={handleLogout} disabled={isLoading} title="Sair da Conta">
                            <FontAwesomeIcon icon={faSignOutAlt} /> Sair
                        </button>
                    </span>
                ) : (
                    <span className="user-info">Carregando...</span>
                )}
                <button onClick={handleNewProject} disabled={isLoading} title="Iniciar Novo Projeto">
                    <FontAwesomeIcon icon={faFileAlt} /> Novo Projeto
                </button>
                 {/* INÍCIO: Botão para o novo aplicativo */}
                <a 
                    href="https://akira2018.github.io/calc_construtor/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="Abrir Calculadora de Construção"
                >
                    <button>
                        <FontAwesomeIcon icon={faCalculator} /> Calculadora
                    </button>
                </a>
                {/* FIM: Botão para o novo aplicativo */}
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

                <button onClick={addRectangle} disabled={isLoading} title="Adicionar Retângulo"><FontAwesomeIcon icon={faSquare} /> Retângulo</button>
                <button onClick={addCircle} disabled={isLoading} title="Adicionar Círculo"><FontAwesomeIcon icon={faCircle} /> Círculo</button>
                <button onClick={addDoor} disabled={isLoading} title="Adicionar Porta"><FontAwesomeIcon icon={faDoorOpen} /> Porta</button>
                <button onClick={addWindow} disabled={isLoading} title="Adicionar Janela"><FontAwesomeIcon icon={faWindowMaximize} /> Janela</button>
                <button onClick={addText} disabled={isLoading} title="Adicionar Texto"><FontAwesomeIcon icon={faFont} /> Texto</button>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                <button
                    onClick={toggleWall}
                    className={isDrawingWall ? 'active' : ''} // Usa a classe 'active' para o estado
                    disabled={isLoading}
                    title="Desenhar Parede"
                >
                    <FontAwesomeIcon icon={faDrawPolygon} /> Desenhar Parede
                </button>
                <button onClick={handleSave} disabled={isLoading} title="Salvar Projeto"><FontAwesomeIcon icon={faSave} /> Salvar</button>
                <button onClick={handleShowProjects} disabled={isLoading} title="Meus Projetos"><FontAwesomeIcon icon={faFolderOpen} /> Meus Projetos</button>
                <button onClick={handleExport} disabled={isLoading} title="Exportar para PNG"><FontAwesomeIcon icon={faFileExport} /> Exportar PNG</button>
                <button onClick={handleDelete} disabled={isLoading} title="Deletar Objeto Selecionado"><FontAwesomeIcon icon={faTrashAlt} /> Deletar</button>
            </div>

            {/* Nova Estrutura para a Biblioteca de Componentes */}
            <div className="library-section">
                <div className="library-header">
                    <h2>Componentes da Biblioteca</h2>
                    <button onClick={toggleLibrary} className="library-toggle-button">
                        <FontAwesomeIcon icon={isLibraryExpanded ? faChevronUp : faChevronDown} />
                    </button>
                </div>
                <div ref={libraryContentRef} className={`library-content ${isLibraryExpanded ? 'expanded' : 'collapsed'}`}>
                    <button onClick={addSofa} disabled={isLoading} title="Adicionar Sofá"><FontAwesomeIcon icon={faCouch} /> Sofá</button>
                    <button onClick={addBed} disabled={isLoading} title="Adicionar Cama"><FontAwesomeIcon icon={faBed} /> Cama</button>
                    <button onClick={addDiningTable} disabled={isLoading} title="Adicionar Mesa de Jantar"><FontAwesomeIcon icon={faChair} /> Mesa de Jantar</button>
                    <button onClick={addToilet} disabled={isLoading} title="Adicionar Vaso Sanitário"><FontAwesomeIcon icon={faToilet} /> Vaso Sanitário</button>
                    <button onClick={addSink} disabled={isLoading} title="Adicionar Pia"><FontAwesomeIcon icon={faSink} /> Pia</button>
                    <button onClick={addBathtub} disabled={isLoading} title="Adicionar Banheira"><FontAwesomeIcon icon={faBath} /> Banheira</button>
                    <button onClick={addLavatory} disabled={isLoading} title="Adicionar Lavatório"><FontAwesomeIcon icon={faHandsWash} /> Lavatório</button>
                    <button onClick={addPoltrona} disabled={isLoading} title="Adicionar Poltrona"><FontAwesomeIcon icon={faChair} /> Poltrona</button>
                    <button onClick={addPiscina} disabled={isLoading} title="Adicionar Piscina"><FontAwesomeIcon icon={faChair} /> Piscina</button>
                    
                </div>
            </div>

            {/* Área principal: Canvas (sempre presente e ocupa o espaço restante) */}
            <div className="canvas-container">
                <canvas id="canvas" ref={canvasRef}></canvas>
            </div>

            {/* Modal de Projetos (renderizado condicionalmente) */}
            {showProjects && (
                <div className="project-modal-overlay">
                    <div className="project-modal-content">
                        <h2>Meus Projetos Salvos</h2>
                        <ul>
                            {projects.length > 0 ? (
                                projects.map((project) => (
                                    <li key={project.id} className="project-item">
                                        <span>{project.name}</span>
                                        <div>
                                            <button onClick={() => handleLoadProject(project)} disabled={isLoading}>Carregar</button>
                                            <button onClick={() => handleDeleteProject(project)} disabled={isLoading} className="delete-btn">Excluir</button>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li>Nenhum projeto salvo.</li>
                            )}
                        </ul>
                        <button onClick={() => setShowProjects(false)} className="project-modal-close-btn">Fechar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

