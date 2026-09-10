import { useState } from "react";
import { X, Shield, Map as MapIcon, Package, ScrollText, Target, Sword, Settings, HelpCircle, ChevronRight, Users, Store, Backpack, BookOpen } from "lucide-react";
import { useStore, actions } from "../store/useStore";
import { Button } from "./ui/Input";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function WelcomeModal() {
  const { uiState } = useStore();
  const [isOpen, setIsOpen] = useState(!uiState.hasSeenWelcome);

  const handleClose = () => {
    setIsOpen(false);
    actions.updateUI({ hasSeenWelcome: true });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#1e1a17]/60 backdrop-blur-xl border border-[#c1a063]/30 rounded-xl max-w-lg w-full p-8 shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        <h2 className="text-2xl font-bold tracking-widest uppercase text-[#c1a063] mb-4 flex items-center gap-3 border-b border-[#c1a063]/10 pb-4 leading-tight">
          <Shield className="text-[#8b7355] shrink-0" size={32} />
          <div>
            Bienvenid@ a<br />
            Nellie's DM Screen
          </div>
        </h2>
        
        <p className="text-[#e6e2da] text-sm leading-relaxed mb-6 mt-4">
          Esta herramienta está diseñada para que tengas todo el control de tu campaña de rol en un solo lugar de forma ágil y ordenada.
        </p>

        <ul className="space-y-4 text-sm text-[#e6e2da] mb-8 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
          <li className="flex items-start gap-3 bg-[#14110f] p-3 border border-[#3a302a] rounded-sm">
            <Users size={20} className="text-[#c1a063] shrink-0 mt-0.5" />
            <span><strong>Grupo y Actores:</strong> Gestiona a tus jugadores, NPCs relevantes y tu propio bestiario de criaturas, todos listos para saltar a la iniciativa con un clic.</span>
          </li>
          <li className="flex items-start gap-3 bg-[#14110f] p-3 border border-[#3a302a] rounded-sm">
            <Sword size={20} className="text-[#c1a063] shrink-0 mt-0.5" />
            <span><strong>Iniciativa Dinámica:</strong> Gestiona combates con cálculo automático. ¡Tip pro: Puedes escribir sumas o restas (ej. <code className="text-[#c1a063] font-bold">-15</code>) directamente en la casilla de vida!</span>
          </li>
          <li className="flex items-start gap-3 bg-[#14110f] p-3 border border-[#3a302a] rounded-sm">
            <Target size={20} className="text-[#c1a063] shrink-0 mt-0.5" />
            <span><strong>Misiones:</strong> Estructura tus tramas de izquierda a derecha. Añade derivadas y detalles ocultos a cada nodo.</span>
          </li>
          <li className="flex items-start gap-3 bg-[#14110f] p-3 border border-[#3a302a] rounded-sm">
            <Store size={20} className="text-[#c1a063] shrink-0 mt-0.5" />
            <span><strong>Tiendas:</strong> Crea tiendas y mercaderes, y administra catálogos de objetos con sus descripciones y precios para tener siempre a mano lo que pueden comprar tus jugadores.</span>
          </li>
          <li className="flex items-start gap-3 bg-[#14110f] p-3 border border-[#3a302a] rounded-sm">
            <Backpack size={20} className="text-[#c1a063] shrink-0 mt-0.5" />
            <span><strong>Objetos y Recompensas:</strong> Diseña items personalizados mágicos y crea Tablas de Botín para generar recompensas aleatorias equilibradas al vuelo.</span>
          </li>
        </ul>

        <div className="bg-[#14110f] border-l-2 border-[#8b7355] p-3 text-xs text-[#8b7355] mb-6 flex items-start gap-2">
          <HelpCircle size={16} className="shrink-0 text-[#c1a063]" />
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
    id: "initiative",
    title: "1. Iniciativa y Combate",
    icon: <Sword size={18} />,
    content: (
      <div className="space-y-4 text-sm text-[#e6e2da] leading-relaxed">
        <p>El tracker de combate es el corazón de la acción, diseñado para ordenar automáticamente los turnos e identificar fácilmente aliados (verde) de enemigos (rojo).</p>
        <ul className="list-disc pl-5 space-y-2 text-[#8b7355]">
          <li><strong className="text-[#c1a063]">Añadir desde Grupo:</strong> El icono superior te permite traer cualquier Personaje, NPC o Criatura de tu base de datos directamente al combate con su iniciativa tirada.</li>
          <li><strong className="text-[#c1a063]">Combatientes Temporales ("Al Vuelo"):</strong> Si surge un combate imprevisto (ej. bandidos genéricos), usa la opción 'Temporal' para añadirlos sin que se guarden permanentemente en tu bestiario, manteniendo la base de datos limpia.</li>
          <li><strong className="text-[#c1a063]">Mecánica de Salud Rápida (¡Truco!):</strong> La casilla de HP soporta matemáticas en vivo. No calcules mentalmente: si un goblin de 30 HP recibe 12 de daño, simplemente haz clic en su salud, escribe <code className="text-[#c1a063] bg-[#14110f] px-1 py-0.5 rounded">-12</code> y pulsa Enter. Se restará solo. Funciona igual con curaciones (<code className="text-[#c1a063] bg-[#14110f] px-1 py-0.5 rounded">+15</code>).</li>
          <li><strong className="text-[#c1a063]">Estados Alterados:</strong> En el menú de 3 puntos de cada personaje puedes aplicar estados (Cegado, Paralizado...). Se mostrará un icono identificativo para que no te olvides de penalizar sus tiradas.</li>
          <li><strong className="text-[#c1a063]">El Cementerio:</strong> Cuando la vida llega a 0, puedes mandar al combatiente al cementerio (el botón de la calavera). Quedará guardado en un registro aparte para que puedas consultar sus stats o loot tras el combate, o revivirlo si resulta ser un no-muerto.</li>
        </ul>
      </div>
    )
  },
  {
    id: "party",
    title: "2. Grupo, NPCs y Criaturas",
    icon: <Shield size={18} />,
    content: (
      <div className="space-y-4 text-sm text-[#e6e2da] leading-relaxed">
        <p>Tu base de datos de actores. Todo lo que crees aquí puede mandarse al combate con el icono de la espada en su ficha.</p>
        <div className="bg-[#1e1a17] p-4 border border-[#c1a063]/30 rounded-sm my-2">
          <h4 className="text-[#c1a063] font-bold mb-2 uppercase tracking-wider text-xs">Sub-pestañas:</h4>
          <ul className="list-disc pl-5 space-y-1 text-[#8b7355]">
            <li><strong>Jugadores:</strong> Las fichas de los héroes (Clase, Nivel, Percepción Pasiva).</li>
            <li><strong>NPCs:</strong> Personajes de la trama, tenderos o aliados relevantes (con sus motivaciones y habilidades).</li>
            <li><strong>Criaturas:</strong> Tu bestiario de monstruos puros, listos para ser carne de cañón.</li>
          </ul>
        </div>
        <ul className="list-disc pl-5 space-y-2 text-[#8b7355]">
          <li><strong className="text-[#c1a063]">Fichas de Estadísticas:</strong> Cada actor guarda su AC, Vida Máxima y Atributos (FUE, DEX...). Al abrir la ficha completa verás su bloque de estadísticas estilo D&D oficial.</li>
          <li><strong className="text-[#c1a063]">Exportación/Importación Modular:</strong> Cada sub-pestaña tiene su icono de guardar/subir. Puedes descargar un JSON sólo con tus Criaturas y pasárselo a otro máster sin destriparle quiénes son tus NPCs importantes. El sistema permite elegir si <em>Fusionar</em> (añadir a lo que ya tienes) o <em>Sobrescribir</em>.</li>
        </ul>
      </div>
    )
  },
  {
    id: "maps",
    title: "3. Mapas y Lugares",
    icon: <MapIcon size={18} />,
    content: (
      <div className="space-y-4 text-sm text-[#e6e2da] leading-relaxed">
        <p>Construye tu mundo visualmente y ten a mano el lore geopolítico.</p>
        <div className="bg-[#1e1a17] p-4 border border-[#c1a063]/30 rounded-sm my-2">
          <h4 className="text-[#c1a063] font-bold mb-2 uppercase tracking-wider text-xs">Sub-pestañas:</h4>
          <ul className="list-disc pl-5 space-y-1 text-[#8b7355]">
            <li><strong>Mapas Interactivos:</strong> Sube URLs de mapas, ábrelos a pantalla completa y haz zoom o arrástralos como en un VTT virtual. Muy útil para mostrar planos en una TV.</li>
            <li><strong>Lugares:</strong> Una mini-wiki de localizaciones. Ciudades, tabernas, o mazmorras con su descripción y región a la que pertenecen.</li>
          </ul>
        </div>
        <ul className="list-disc pl-5 space-y-2 text-[#8b7355]">
          <li><strong className="text-[#c1a063]">Visualizador Inmersivo:</strong> Al pulsar un mapa, el entorno se oscurece y elimina las distracciones para que puedas orientarte a la perfección.</li>
        </ul>
      </div>
    )
  },
  {
    id: "quests",
    title: "4. Misiones",
    icon: <Target size={18} />,
    content: (
      <div className="space-y-4 text-sm text-[#e6e2da] leading-relaxed">
        <p>Un sistema de ramificación (árbol jerárquico) para tramas complejas, evitando las típicas listas interminables.</p>
        <ul className="list-disc pl-5 space-y-2 text-[#8b7355]">
          <li><strong className="text-[#c1a063]">Misión Raíz vs Submisión:</strong> Creas primero las tramas principales. Usando el icono de las flechas divergentes ("Ramificar") puedes crear misiones derivadas vinculadas visualmente a la principal (ej. Misión: Entrar al castillo &gt; Submisión: Conseguir la llave del pozo).</li>
          <li><strong className="text-[#c1a063]">Estados Rotativos:</strong> El icono circular a la izquierda del título te permite hacer clic para ciclar el estado de la misión: <span className="text-yellow-500">Pendiente</span> &rarr; <span className="text-green-500">Completada</span> &rarr; <span className="text-red-500">Fallida</span>.</li>
          <li><strong className="text-[#c1a063]">Pistas y Recompensas (+):</strong> Con el botón de suma puedes añadir notas internas a un nodo (una pista sobre el asesino, el tesoro que encontrarán...).</li>
          <li><strong className="text-[#c1a063]">Modo Lectura:</strong> Hacer clic en el propio título o imagen de la misión la abrirá en un modal grande, limpio, perfecto para leerle el texto introductorio a tus jugadores sin forzar la vista.</li>
        </ul>
      </div>
    )
  },
  {
    id: "notes",
    title: "5. Notas",
    icon: <BookOpen size={18} />,
    content: (
      <div className="space-y-4 text-sm text-[#e6e2da] leading-relaxed">
        <p>Tu libreta de diseño de campaña con soporte Markdown avanzado.</p>
        <ul className="list-disc pl-5 space-y-2 text-[#8b7355]">
          <li><strong className="text-[#c1a063]">Formato Markdown:</strong> Escribe texto enriquerico rápidamente usando símbolos estándar: <code className="text-[#c1a063]"># Título</code>, <code className="text-[#c1a063]">**Negrita**</code>, <code className="text-[#c1a063]">- Lista</code>. Se renderizará perfectamente al visualizar la nota.</li>
          <li><strong className="text-[#c1a063]">Codificación por Color:</strong> A cada nota puedes asignarle una textura/color visual (Rojo para combates peligrosos, Azul para Lore antiguo...). Así reconoces tus archivos de un vistazo.</li>
        </ul>
      </div>
    )
  },
  {
    id: "shops",
    title: "6. Tiendas",
    icon: <Store size={18} />,
    content: (
      <div className="space-y-4 text-sm text-[#e6e2da] leading-relaxed">
        <p>Tenderos, mercancías y catálogos de compraventa a tu alcance.</p>
        <ul className="list-disc pl-5 space-y-2 text-[#8b7355]">
          <li><strong className="text-[#c1a063]">Creación de Tiendas:</strong> Añade un mercader con su nombre, el nombre de su establecimiento y una imagen de perfil. Al hacer clic sobre él, entrarás a su inventario.</li>
          <li><strong className="text-[#c1a063]">Inventario Personalizado:</strong> Dentro de cada tienda, puedes añadir los objetos que tiene a la venta escribiendo su nombre, precio (ej: 50 gp), descripción e incluso subiendo una imagen para mostrársela a tus jugadores.</li>
          <li><strong className="text-[#c1a063]">Control Visual y Ocultación:</strong> Los objetos de la tienda se presentan en forma de tarjetas o listas limpias. Si necesitas ocultar temporalmente un ítem porque se ha agotado (o porque el mercader aún no se lo quiere mostrar a los jugadores), puedes usar el icono del <strong>Ojo</strong> para ocultarlo sin tener que borrarlo.</li>
        </ul>
      </div>
    )
  },
  {
    id: "items",
    title: "7. Objetos y Tablas de Botín",
    icon: <Package size={18} />,
    content: (
      <div className="space-y-4 text-sm text-[#e6e2da] leading-relaxed">
        <p>Tu arsenal personal y el sistema de botín aleatorio.</p>
        <div className="bg-[#1e1a17] p-4 border border-[#c1a063]/30 rounded-sm my-2">
          <h4 className="text-[#c1a063] font-bold mb-2 uppercase tracking-wider text-xs">Sub-pestañas:</h4>
          <ul className="list-disc pl-5 space-y-1 text-[#8b7355]">
            <li><strong>Objetos Únicos:</strong> Crea cartas detalladas de objetos importantes. Añádeles un nombre, descripción, valor (precio) y una imagen representativa para visualizarlos como un inventario de gran calidad.</li>
            <li><strong>Tablas de Botín:</strong> El sistema perfecto para generar loot rápido tras un combate.</li>
          </ul>
        </div>
        <ul className="list-disc pl-5 space-y-2 text-[#8b7355]">
          <li><strong className="text-[#c1a063]">Creación de Tablas:</strong> Crea una tabla (ej. "Tesoro de Dragón"). El editor de texto te permite escribir un objeto o recompensa por línea. Si quieres que algo tenga más probabilidad de salir, simplemente repítelo en varias líneas.</li>
          <li><strong className="text-[#c1a063]">Tirar el Dado:</strong> Al ver tus tablas de botín, haz clic en el icono del dado que aparece en la cabecera de cada una de ellas. La herramienta tirará un dado virtual basado en el total de líneas y extraerá instantáneamente tu recompensa sin necesidad de dados porcentuales.</li>
        </ul>
      </div>
    )
  },
  {
    id: "global",
    title: "8. Sistema Global y Herramientas",
    icon: <Settings size={18} />,
    content: (
      <div className="space-y-4 text-sm text-[#e6e2da] leading-relaxed">
        <p>Herramientas omnipresentes para no tener que salir nunca de la página de Rol.</p>
        <ul className="list-disc pl-5 space-y-2 text-[#8b7355]">
          <li><strong className="text-[#c1a063]">Autoguardado 100% Offline:</strong> No hay servidores, todo se guarda en tu navegador automáticamente, a prueba de cortes de internet.</li>
          <li><strong className="text-[#c1a063]">Buscador Global (La lupa):</strong> En la barra superior. Si tus jugadores mencionan "El Zafiro Negro", escríbelo ahí y la app buscará en Notas, Objetos, NPCs y Mapas a la vez.</li>
          <li><strong className="text-[#c1a063]">Calculadora Integrada:</strong> Accesible desde cualquier lugar en el icono lateral superior. No ensucies la mesa con hojas en sucio, haz sumas rápidas o restas de daño directamente.</li>
          <li><strong className="text-[#c1a063]">Exportación Total (Engranaje):</strong> Genera tu <code>ndms_datos_completos.json</code> para guardar un backup de absolutamente TODO, pasarlo a otro PC, o restaurar la partida tras formatear el ordenador. Al importar, podrás elegir Fusionar (juntar datos) o Sobrescribir (borrar todo y dejar solo lo nuevo).</li>
        </ul>
      </div>
    )
  },
  {
    id: "legal",
    title: "Legal y Privacidad",
    icon: <ScrollText size={18} />,
    content: (
      <div className="space-y-4 text-sm text-[#e6e2da] leading-relaxed">
        <div className="bg-[#1e1a17] p-4 border border-[#c1a063]/30 rounded-sm">
          <h4 className="text-[#c1a063] font-bold mb-2 uppercase tracking-wider text-xs">Política de Privacidad</h4>
          <p>Esta aplicación funciona bajo un modelo <strong>Local-First</strong>. No recopilamos, procesamos, almacenamos en la nube ni transferimos ningún dato personal. Toda la información de tus partidas, personajes y notas se almacena <strong>exclusivamente de forma local en tu navegador</strong> mediante <code>localStorage</code> y/o <code>IndexedDB</code>.</p>
        </div>
        <div className="bg-[#1e1a17] p-4 border border-[#c1a063]/30 rounded-sm">
          <h4 className="text-[#c1a063] font-bold mb-2 uppercase tracking-wider text-xs">Aviso Legal y Exención de Responsabilidad</h4>
          <p>Dado que los datos residen únicamente en tu dispositivo, el desarrollador no se hace responsable de la pérdida accidental de datos producida por borrar la caché, restablecer el navegador, o el uso de modos incógnito/privados. <strong>Te recomendamos encarecidamente utilizar la función de Exportar Datos periódicamente para mantener copias de seguridad de tus campañas.</strong> El servicio se ofrece "tal cual", sin garantías de ningún tipo.</p>
        </div>
        <div className="bg-[#1e1a17] p-4 border border-[#c1a063]/30 rounded-sm">
          <h4 className="text-[#c1a063] font-bold mb-2 uppercase tracking-wider text-xs">Aviso sobre Derechos de Autor (D&D 5e)</h4>
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
      <div className="bg-[#1e1a17]/60 backdrop-blur-xl border border-[#c1a063]/30 rounded-xl max-w-4xl w-full h-[80vh] shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-black/40 border-r border-[#c1a063]/10 flex flex-col shrink-0">
          <div className="p-4 border-b border-[#c1a063]/10 flex justify-between items-center bg-black/40">
            <h2 className="text-[#c1a063] font-bold tracking-widest uppercase text-sm flex items-center gap-2">
              <HelpCircle size={16} /> Manual del Máster
            </h2>
            <button onClick={onClose} className="md:hidden text-[#8b7355] hover:text-[#c1a063]">
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
                    ? "bg-[#c1a063]/10 text-[#c1a063] border border-[#c1a063]/30" 
                    : "text-[#8b7355] hover:bg-[#1a1614] hover:text-[#e6e2da] border border-transparent"
                )}
              >
                {sec.icon}
                <span className="flex-1 truncate">{sec.title}</span>
                {activeSection === sec.id && <ChevronRight size={14} />}
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-[#3a302a] text-left mt-auto">
            <span className="text-[10px] text-[#8b7355] opacity-40 font-mono tracking-wider select-none">NDMScreen 1.1 | © Bayonora |</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
          <button onClick={onClose} className="hidden md:flex absolute top-4 right-4 text-[#8b7355] hover:text-white transition-colors z-10 bg-[#1e1a17] p-1 rounded-sm border border-[#3a302a]">
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
                    <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[#c1a063]/10">
                      <div className="p-3 bg-[#1e1a17] rounded-md border border-[#c1a063]/30 text-[#c1a063]">
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
          
          <div className="p-4 border-t border-[#3a302a] bg-[#1a1614] flex justify-end">
             <Button onClick={onClose} className="px-6 text-xs tracking-widest">Cerrar Manual</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
