import { useState } from "react";
import { X, Shield, Map as MapIcon, Package, ScrollText, Target, Sword, Settings, HelpCircle, ChevronRight, Users, Store, Backpack, BookOpen } from "lucide-react";
import { useStore, actions } from "../store/useStore";
import { Button } from "./ui/Input";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function WelcomeModal() {
  const uiState = useStore((state) => state.uiState);
  const [isOpen, setIsOpen] = useState(!uiState.hasSeenWelcome);

  const handleClose = () => {
    setIsOpen(false);
    actions.updateUI({ hasSeenWelcome: true });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center p-4">
      <div className="bg-dm-bg/60 backdrop-blur-xl border border-dm-accent/30 rounded-xl max-w-lg w-full p-8 shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        <h2 className="text-2xl font-bold tracking-widest uppercase text-dm-accent mb-4 flex items-center gap-3 border-b border-dm-accent/10 pb-4 leading-tight">
          <Shield className="text-dm-muted shrink-0" size={32} />
          <div>
            Bienvenid@ a<br />
            Nellie's DM Screen
          </div>
        </h2>
        
        <p className="text-dm-text text-sm leading-relaxed mb-6 mt-4">
          Esta herramienta está diseñada para que tengas todo el control de tu campaña de rol en un solo lugar de forma ágil y ordenada.
        </p>

        <ul className="space-y-4 text-sm text-dm-text mb-8 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
          <li className="flex items-start gap-3 bg-dm-bg-alt p-3 border border-dm-border rounded-sm">
            <Users size={20} className="text-dm-accent shrink-0 mt-0.5" />
            <span><strong>Grupo, Combate y Magia:</strong> Gestiona actores, lánzalos a un Tracker de Iniciativa dinámico y consulta un Grimorio 5e integrado.</span>
          </li>
          <li className="flex items-start gap-3 bg-dm-bg-alt p-3 border border-dm-border rounded-sm">
            <MapIcon size={20} className="text-dm-accent shrink-0 mt-0.5" />
            <span><strong>Mapas y Lugares:</strong> Carga mapas del mundo, navega por niveles (Ciudades, Mazmorras) y añade pins interactivos encima de los mapas.</span>
          </li>
          <li className="flex items-start gap-3 bg-dm-bg-alt p-3 border border-dm-border rounded-sm">
            <Target size={20} className="text-dm-accent shrink-0 mt-0.5" />
            <span><strong>Misiones y Notas:</strong> Organiza complejas redes de misiones secundarias y lleva un bloc de notas dinámico compatible con Markdown.</span>
          </li>
          <li className="flex items-start gap-3 bg-dm-bg-alt p-3 border border-dm-border rounded-sm">
            <Store size={20} className="text-dm-accent shrink-0 mt-0.5" />
            <span><strong>Tiendas, Objetos y Botín:</strong> Administra catálogos de mercaderes, forja objetos personalizados y lanza dados en Tablas de Botín automatizadas.</span>
          </li>
        </ul>

        <div className="bg-dm-bg-alt border-l-2 border-dm-muted p-3 text-xs text-dm-muted mb-6 flex items-start gap-2">
          <HelpCircle size={16} className="shrink-0 text-dm-accent" />
          <p>
            Para un tutorial detallado sobre cómo aprovechar cada rincón, pulsa el <strong>botón (i)</strong> junto a la calculadora en el menú lateral.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleClose} className="px-8 font-bold tracking-widest text-xs h-10 hover:scale-105 transition-transform">
            ¡Entendido, a jugar!
          </Button>
        </div>
      </div>
    </div>
  );
}

const TUTORIAL_SECTIONS = [
  {
    id: "party",
    title: "1. Grupo, NPCs y Criaturas",
    icon: <Shield size={18} />,
    content: (
      <div className="space-y-4 text-sm text-dm-text leading-relaxed">
        <p>Tu base de datos de actores. Todo lo que crees aquí se guardará para que puedas importarlo rápidamente a un combate desde la pestaña de Iniciativa.</p>
        <div className="bg-dm-bg p-4 border border-dm-accent/30 rounded-sm my-2">
          <h4 className="text-dm-accent font-bold mb-2 uppercase tracking-wider text-xs">Sub-pestañas:</h4>
          <ul className="list-disc pl-5 space-y-1 text-dm-muted">
            <li><strong>Jugadores:</strong> Las fichas de los héroes (Clase, Nivel, Percepción Pasiva).</li>
            <li><strong>NPCs:</strong> Personajes de la trama, tenderos o aliados relevantes (con sus motivaciones y habilidades).</li>
            <li><strong>Criaturas:</strong> Tu bestiario de monstruos puros, listos para ser carne de cañón.</li>
          </ul>
        </div>
        <ul className="list-disc pl-5 space-y-2 text-dm-muted">
          <li><strong className="text-dm-accent">Fichas de Estadísticas:</strong> Cada actor guarda su AC, Vida Máxima y Atributos (FUE, DEX...). Al abrir la ficha completa verás su bloque de estadísticas estilo D&D oficial.</li>
        </ul>
      </div>
    )
  },
  {
    id: "initiative",
    title: "2. Iniciativa y Combate",
    icon: <Sword size={18} />,
    content: (
      <div className="space-y-4 text-sm text-dm-text leading-relaxed">
        <p>El tracker de combate es el corazón de la acción, diseñado para ordenar automáticamente los turnos e identificar fácilmente aliados (verde) de enemigos (rojo).</p>
        <ul className="list-disc pl-5 space-y-2 text-dm-muted">
          <li><strong className="text-dm-accent">Añadir desde Grupo:</strong> El botón "Añadir a Iniciativa" te permite traer cualquier Personaje, NPC o Criatura de tu base de datos directamente al combate, introduciendo la tirada que hayan sacado.</li>
          <li><strong className="text-dm-accent">Combatientes Temporales:</strong> Si surge un combate imprevisto (ej. bandidos genéricos), usa la opción 'Temporal' para añadirlos sin que se guarden permanentemente en tu bestiario, manteniendo la base de datos limpia.</li>
          <li><strong className="text-dm-accent">Mecánica de Salud Rápida:</strong> La casilla de HP soporta matemáticas en vivo. No calcules mentalmente: si un goblin de 30 HP recibe 12 de daño, simplemente haz clic en su salud, escribe <code className="text-dm-accent bg-dm-bg-alt px-1 py-0.5 rounded">-12</code> y pulsa Enter. Se restará solo. Funciona igual con curaciones (<code className="text-dm-accent bg-dm-bg-alt px-1 py-0.5 rounded">+15</code>).</li>
          <li><strong className="text-dm-accent">Estados Alterados:</strong> En el menú de 3 puntos de cada personaje puedes aplicar estados (Cegado, Paralizado...). Se mostrará un icono identificativo para que no te olvides de penalizar sus tiradas.</li>
          <li><strong className="text-dm-accent">El Cementerio:</strong> Cuando eliminas a un combatiente lo mandas al cementerio. Quedará guardado en un registro aparte para que puedas consultar sus stats o revivirlo si es necesario.</li>
        </ul>
      </div>
    )
  },
  {
    id: "quests",
    title: "3. Misiones",
    icon: <Target size={18} />,
    content: (
      <div className="space-y-4 text-sm text-dm-text leading-relaxed">
        <p>Un sistema de árbol jerárquico para organizar tramas complejas, evitando las típicas listas interminables.</p>
        <ul className="list-disc pl-5 space-y-2 text-dm-muted">
          <li><strong className="text-dm-accent">Misión Raíz vs Submisión:</strong> Creas primero las tramas principales. Usando el botón "+" debajo de cualquier misión puedes crear sub-misiones que quedarán indentadas jerárquicamente debajo de la principal.</li>
          <li><strong className="text-dm-accent">Estados Rotativos:</strong> El icono circular a la izquierda del título te permite hacer clic para ciclar el estado de la misión: <span className="text-yellow-500">Pendiente</span> &rarr; <span className="text-green-500">Completada</span> &rarr; <span className="text-red-500">Fallida</span>.</li>
          <li><strong className="text-dm-accent">Pistas y Recompensas (+):</strong> Con el botón de suma puedes añadir notas internas a un nodo (una pista sobre el asesino, el tesoro que encontrarán...).</li>
          <li><strong className="text-dm-accent">Modo Lectura:</strong> Hacer clic en el propio título o imagen de la misión la abrirá en un modal grande, limpio, perfecto para leerle el texto introductorio a tus jugadores sin forzar la vista.</li>
        </ul>
      </div>
    )
  },
  {
    id: "maps",
    title: "4. Mapas y Lugares",
    icon: <MapIcon size={18} />,
    content: (
      <div className="space-y-4 text-sm text-dm-text leading-relaxed">
        <p>Construye tu mundo visualmente y ten a mano el lore geopolítico.</p>
        <ul className="list-disc pl-5 space-y-2 text-dm-muted">
          <li><strong className="text-dm-accent">Estructura de Carpetas Geográficas:</strong> Ahora puedes organizar tu mundo de forma jerárquica. Por ejemplo: Mapa Continental &gt; Reino &gt; Ciudad &gt; Mazmorra. Haz clic en "Entrar" en cualquier lugar para ver qué contiene.</li>
          <li><strong className="text-dm-accent">Mapas Interactivos:</strong> Cada nodo puede tener una "Imagen de Fondo" que actúa como mapa físico. Puedes cargar imágenes desde tu PC o añadir URLs. El visor incluye herramientas de Paneo (arrastrar) y Zoom.</li>
          <li><strong className="text-dm-accent">Pins en el Mapa:</strong> Al navegar dentro de un mapa físico que contiene sub-lugares, los verás listados a la derecha. Coloca Pins para asignar a cada sub-lugar una coordenada (X, Y) visual directamente sobre la imagen.</li>
        </ul>
      </div>
    )
  },
  {
    id: "shops",
    title: "5. Tiendas",
    icon: <Store size={18} />,
    content: (
      <div className="space-y-4 text-sm text-dm-text leading-relaxed">
        <p>Tenderos, mercancías y catálogos de compraventa a tu alcance.</p>
        <ul className="list-disc pl-5 space-y-2 text-dm-muted">
          <li><strong className="text-dm-accent">Creación de Tiendas:</strong> Añade un mercader con su nombre, el nombre de su establecimiento y una imagen de perfil. Al hacer clic sobre él, entrarás a su inventario.</li>
          <li><strong className="text-dm-accent">Inventario Personalizado:</strong> Dentro de cada tienda, puedes añadir los objetos que tiene a la venta escribiendo su nombre, precio (ej: 50 gp), descripción e incluso subiendo una imagen para mostrársela a tus jugadores.</li>
          <li><strong className="text-dm-accent">Control Visual y Ocultación:</strong> Los objetos de la tienda se presentan en forma de tarjetas o listas limpias. Si necesitas ocultar temporalmente un ítem porque se ha agotado (o porque el mercader aún no se lo quiere mostrar a los jugadores), puedes usar el icono del <strong>Ojo</strong> para ocultarlo sin tener que borrarlo.</li>
        </ul>
      </div>
    )
  },
  {
    id: "notes",
    title: "6. Notas",
    icon: <BookOpen size={18} />,
    content: (
      <div className="space-y-4 text-sm text-dm-text leading-relaxed">
        <p>Tu libreta de diseño de campaña con soporte Markdown avanzado.</p>
        <ul className="list-disc pl-5 space-y-2 text-dm-muted">
          <li><strong className="text-dm-accent">Organización Drag & Drop:</strong> Arrastra y suelta las tarjetas de tus notas para reordenarlas en el tablero visual como más te guste.</li>
          <li><strong className="text-dm-accent">Formato Markdown:</strong> Escribe texto enriquecido rápidamente usando símbolos estándar: <code className="text-dm-accent"># Título</code>, <code className="text-dm-accent">**Negrita**</code>, <code className="text-dm-accent">- Lista</code>. Se renderizará perfectamente, con soporte para tablas y saltos de línea.</li>
          <li><strong className="text-dm-accent">Codificación por Color:</strong> A cada nota puedes asignarle un color de fondo (Rojo, Verde, Morado...). Así reconoces tus archivos de un vistazo.</li>
        </ul>
      </div>
    )
  },
  {
    id: "items",
    title: "7. Objetos y Tablas de Botín",
    icon: <Package size={18} />,
    content: (
      <div className="space-y-4 text-sm text-dm-text leading-relaxed">
        <p>Tu arsenal personal y el sistema de botín aleatorio.</p>
        <div className="bg-dm-bg p-4 border border-dm-accent/30 rounded-sm my-2">
          <h4 className="text-dm-accent font-bold mb-2 uppercase tracking-wider text-xs">Sub-pestañas:</h4>
          <ul className="list-disc pl-5 space-y-1 text-dm-muted">
            <li><strong>Objetos Únicos:</strong> Crea cartas detalladas de objetos importantes. Añádeles un nombre, descripción, valor (precio) y una imagen representativa para visualizarlos como un inventario de gran calidad.</li>
            <li><strong>Tablas de Botín:</strong> El sistema perfecto para generar loot rápido tras un combate.</li>
          </ul>
        </div>
        <ul className="list-disc pl-5 space-y-2 text-dm-muted">
          <li><strong className="text-dm-accent">Creación de Tablas:</strong> Crea una tabla (ej. "Tesoro de Dragón"). El editor de texto te permite escribir un objeto o recompensa por línea. Si quieres que algo tenga más probabilidad de salir, simplemente repítelo en varias líneas.</li>
          <li><strong className="text-dm-accent">Tirar el Dado:</strong> Al ver tus tablas de botín, haz clic en el icono del dado que aparece en la cabecera de cada una de ellas. La herramienta tirará un dado virtual basado en el total de líneas y extraerá instantáneamente tu recompensa sin necesidad de dados porcentuales.</li>
        </ul>
      </div>
    )
  },
  {
    id: "grimoire",
    title: "8. El Grimorio",
    icon: <BookOpen size={18} />,
    content: (
      <div className="space-y-4 text-sm text-dm-text leading-relaxed">
        <p>Una biblioteca completa con la magia oficial del sistema D&D 5e.</p>
        <ul className="list-disc pl-5 space-y-2 text-dm-muted">
          <li><strong className="text-dm-accent">Base de Datos SRD 5e:</strong> Todos los conjuros estándar precargados y formateados, con indicadores visuales si requieren componentes Verbales (V), Somáticos (S) o Materiales (M).</li>
          <li><strong className="text-dm-accent">Filtros Mágicos:</strong> Usa las barras superiores para aislar conjuros por nivel, Escuela de magia o Clase (Magos, Clérigos, etc).</li>
          <li><strong className="text-dm-accent">Favoritos:</strong> Marca tus conjuros más usados (o los de tus enemigos/jugadores) como Favoritos. Aparecerán listados en una sub-pestaña especial para acceso instantáneo durante la sesión.</li>
        </ul>
      </div>
    )
  },
  {
    id: "global",
    title: "9. Sistema Global y Herramientas",
    icon: <Settings size={18} />,
    content: (
      <div className="space-y-4 text-sm text-dm-text leading-relaxed">
        <p>Herramientas omnipresentes para no tener que salir nunca de la página de Rol.</p>
        <ul className="list-disc pl-5 space-y-2 text-dm-muted">
          <li><strong className="text-dm-accent">Autoguardado 100% Offline:</strong> No hay servidores, todo se guarda en tu navegador automáticamente, a prueba de cortes de internet.</li>
          <li><strong className="text-dm-accent">Buscador Global:</strong> En la barra superior. Si tus jugadores mencionan "El Zafiro Negro", escríbelo ahí y la app buscará en Notas, Objetos, NPCs y Mapas a la vez.</li>
          <li><strong className="text-dm-accent">Calculadora Integrada:</strong> Accesible desde cualquier lugar en el icono lateral superior. No ensucies la mesa con hojas en sucio, haz sumas rápidas o restas de daño directamente.</li>
		  <li><strong className="text-dm-accent">Exportación/Importación Individual:</strong> Cada sub-pestaña tiene su icono de guardar/subir. Puedes descargar un JSON sólo con tus Criaturas y pasárselo a otro máster sin destriparle quiénes son tus NPCs importantes. El sistema permite elegir si <em>Fusionar</em> (añadir a lo que ya tienes) o <em>Sobrescribir</em>.</li>
          <li><strong className="text-dm-accent">Exportación Total:</strong> Genera un json para guardar un backup de absolutamente TODO, pasarlo a otro PC, o restaurar la partida tras formatear el ordenador. Al importar, podrás elegir Fusionar (juntar datos) o Sobrescribir (borrar todo y dejar solo lo nuevo).</li>
        </ul>
      </div>
    )
  },
  {
    id: "legal",
    title: "Legal y Privacidad",
    icon: <ScrollText size={18} />,
    content: (
      <div className="space-y-4 text-sm text-dm-text leading-relaxed">
        <div className="bg-dm-bg p-4 border border-dm-accent/30 rounded-sm">
          <h4 className="text-dm-accent font-bold mb-2 uppercase tracking-wider text-xs">Política de Privacidad</h4>
          <p>Esta aplicación funciona bajo un modelo <strong>Local-First</strong>. No recopilamos, procesamos, almacenamos en la nube ni transferimos ningún dato personal. Toda la información de tus partidas, personajes y notas se almacena <strong>exclusivamente de forma local en tu navegador</strong> mediante <code>localStorage</code> y/o <code>IndexedDB</code>.</p>
        </div>
        <div className="bg-dm-bg p-4 border border-dm-accent/30 rounded-sm">
          <h4 className="text-dm-accent font-bold mb-2 uppercase tracking-wider text-xs">Aviso Legal y Exención de Responsabilidad</h4>
          <p>Dado que los datos residen únicamente en tu dispositivo, el desarrollador no se hace responsable de la pérdida accidental de datos producida por borrar la caché, restablecer el navegador, o el uso de modos incógnito/privados. <strong>Te recomendamos encarecidamente utilizar la función de Exportar Datos periódicamente para mantener copias de seguridad de tus campañas.</strong> El servicio se ofrece "tal cual", sin garantías de ningún tipo.</p>
        </div>
        <div className="bg-dm-bg p-4 border border-dm-accent/30 rounded-sm">
          <h4 className="text-dm-accent font-bold mb-2 uppercase tracking-wider text-xs">Aviso sobre Derechos de Autor (D&D 5e)</h4>
          <p>Esta herramienta es un recurso para fans y no está afiliada, respaldada, patrocinada, ni aprobada específicamente por Wizards of the Coast LLC. Esta aplicación está sujeta y construida en conformidad con la Fan Content Policy de WotC y la Open Game License (OGL). Ningún material oficial de pago de Dungeons & Dragons se incluye de forma pre-cargada. Los usuarios son responsables del contenido (incluyendo imágenes o textos) que decidan introducir en su almacenamiento local.</p>
        </div>
      </div>
    )
  }

];

export function FullTutorialModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [activeSection, setActiveSection] = useState(TUTORIAL_SECTIONS[0].id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center p-4">
      <div className="bg-dm-bg/60 backdrop-blur-xl border border-dm-accent/30 rounded-xl max-w-4xl w-full h-[80vh] shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-black/40 border-r border-dm-accent/10 flex flex-col shrink-0">
          <div className="p-4 border-b border-dm-accent/10 flex justify-between items-center bg-black/40">
            <h2 className="text-dm-accent font-bold tracking-widest uppercase text-sm flex items-center gap-2">
              <HelpCircle size={16} /> Manual del Máster
            </h2>
            <button onClick={onClose} className="md:hidden text-dm-muted hover:text-dm-accent">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {TUTORIAL_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-sm flex items-center gap-3 text-sm font-medium transition-colors",
                  activeSection === sec.id 
                    ? "bg-dm-accent/10 text-dm-accent border border-dm-accent/30" 
                    : "text-dm-muted hover:bg-dm-bg-hover hover:text-dm-text border border-transparent"
                )}
              >
                {sec.icon}
                <span className="flex-1 truncate">{sec.title}</span>
                {activeSection === sec.id && <ChevronRight size={14} />}
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-dm-border text-left mt-auto">
            <span className="text-[10px] text-dm-muted opacity-40 font-mono tracking-wider select-none">NDMScreen 1.1 | © Bayonora |</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
          <button onClick={onClose} className="hidden md:flex absolute top-4 right-4 text-dm-muted hover:text-white transition-colors z-10 bg-dm-bg p-1 rounded-sm border border-dm-border">
            <X size={20} />
          </button>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 relative z-0">
            <AnimatePresence mode="wait">
              {TUTORIAL_SECTIONS.map((sec) => (
                sec.id === activeSection && (
                  <motion.div
                    key={sec.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-dm-accent/10">
                      <div className="p-3 bg-dm-bg rounded-md border border-dm-accent/30 text-dm-accent">
                        {sec.icon}
                      </div>
                      <h3 className="text-2xl font-light tracking-widest uppercase text-white">
                        {sec.title}
                      </h3>
                    </div>
                    
                    <div className="prose prose-invert max-w-none">
                      {sec.content}
                    </div>
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          </div>
          
          <div className="p-4 border-t border-dm-border bg-dm-bg-hover flex justify-end">
             <Button onClick={onClose} className="px-6 text-xs tracking-widest">Cerrar Manual</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
