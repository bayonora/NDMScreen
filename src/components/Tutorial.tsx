import React, { useState } from "react";
import { X, Shield, Map as MapIcon, ScrollText, Target, Swords, HelpCircle, ChevronRight, Users, Store, Backpack, BookOpen, Skull, StickyNote, Compass, Lightbulb, Keyboard, Wrench } from "lucide-react";
import { useStore, actions } from "../store/useStore";
import { Button } from "./ui/Input";
import { cn } from "../lib/utils";
import { Overlay } from "./ui/Modal";
import { motion, AnimatePresence } from "motion/react";
import { CC_BY_ATTRIBUTION, OGL_SECTIONS, OGL_COPYRIGHT_NOTICE, CREDITS } from "../data/legalTexts";

export function WelcomeModal() {
  const hasSeenWelcome = useStore((state) => state.uiState.hasSeenWelcome);
  const [isOpen, setIsOpen] = useState(!hasSeenWelcome);

  const handleClose = () => {
    setIsOpen(false);
    actions.updateUI({ hasSeenWelcome: true });
  };

  return (
    <Overlay isOpen={isOpen} onClose={handleClose} zIndex="z-[100]">
      <div role="dialog" aria-modal="true" className="bg-dm-bg/80 backdrop-blur-xl gecko:backdrop-filter-none gecko:bg-dm-bg/95 border border-dm-accent/30 rounded-xl max-w-lg w-full max-h-full overflow-y-auto custom-scrollbar p-5 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative animate-in fade-in zoom-in-95 duration-300">
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
            <span><strong>Grupo, Combate y Magia:</strong> Gestiona actores, lánzalos a un Tracker de Iniciativa dinámico y consulta un Grimorio y un Bestiario 5e integrados.</span>
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
            Para un tutorial detallado sobre cómo aprovechar cada rincón, pulsa el <strong>botón (i)</strong> de la cabecera (en el móvil, dentro de <strong>Más</strong>).
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleClose} className="px-8 font-bold tracking-widest text-xs h-10 hover:scale-105 transition-transform">
            ¡Entendido, a jugar!
          </Button>
        </div>
      </div>
    </Overlay>
  );
}

/* Building blocks for the manual pages, so every section reads the same way. */

function Page({ intro, children }: { intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-5 text-sm text-dm-text leading-relaxed">
      <p className="text-base text-dm-text-bright">{intro}</p>
      {children}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-dm-accent font-bold uppercase tracking-wider text-xs">{title}</h4>
      {children}
    </section>
  );
}

function Features({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-2 text-dm-muted marker:text-dm-accent/60">{children}</ul>;
}

function F({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <li>
      <strong className="text-dm-text-bright">{name}:</strong> {children}
    </li>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal pl-5 space-y-2 text-dm-muted marker:text-dm-accent marker:font-bold">{children}</ol>;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-dm-accent/5 border border-dm-accent/30 rounded-sm p-3 text-dm-text">
      <Lightbulb size={16} className="text-dm-accent shrink-0 mt-0.5" />
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded border border-dm-border border-b-2 bg-dm-bg-darker text-[11px] font-sans text-dm-text-bright align-middle">
      {children}
    </kbd>
  );
}

function C({ children }: { children: React.ReactNode }) {
  return <code className="text-dm-accent bg-dm-bg-darker border border-dm-border/60 px-1 py-0.5 rounded-sm text-[12px]">{children}</code>;
}

function ShortcutTable({ rows }: { rows: { keys: React.ReactNode; text: string }[] }) {
  return (
    <ul className="divide-y divide-dm-border/50 border border-dm-border rounded-sm bg-dm-bg-darker/50">
      {rows.map((r) => (
        <li key={r.text} className="flex items-center gap-3 px-3 py-2">
          <span className="flex items-center gap-1 shrink-0 w-24 sm:w-32">{r.keys}</span>
          <span className="min-w-0 text-dm-text">{r.text}</span>
        </li>
      ))}
    </ul>
  );
}

const TUTORIAL_SECTIONS = [
  {
    id: "start",
    title: "Primeros pasos",
    icon: <Compass size={18} />,
    content: (
      <Page intro="NDMScreen es tu pantalla del máster: fichas, combate, mundo, notas y reglas en un solo sitio, pensada para usarla en mitad de la partida sin perder el ritmo.">
        <Block title="Tu primera sesión en 5 pasos">
          <Steps>
            <li><strong className="text-dm-text-bright">Crea a los jugadores</strong> en <em>Grupo › Jugadores</em> con el botón <strong>Añadir</strong>. Con nombre, CA, PV y Destreza ya es suficiente para jugar.</li>
            <li><strong className="text-dm-text-bright">Prepara a los enemigos</strong> en el <em>Bestiario</em>: busca la criatura, guárdala en tus criaturas o lánzala directamente al combate.</li>
            <li><strong className="text-dm-text-bright">Lleva el combate</strong> en <em>Iniciativa</em>: pulsa <strong>Iniciar Combate</strong> y avanza con <strong>Siguiente Turno</strong>. La app cuenta las rondas por ti.</li>
            <li><strong className="text-dm-text-bright">Apunta lo que pase</strong> en <em>Notas</em>: pulsa <Kbd>N</Kbd>, escribe y pulsa <Kbd>Enter</Kbd>. Sin abrir ventanas.</li>
            <li><strong className="text-dm-text-bright">Guarda una copia</strong> al terminar en <em>Ajustes › Exportar Todo</em>.</li>
          </Steps>
        </Block>
        <Block title="Cómo se guarda todo">
          <Features>
            <F name="Automático">cada cambio se guarda al momento en tu navegador; verás «Guardado» en la cabecera. No hay cuentas ni servidores y funciona sin internet una vez cargada.</F>
            <F name="Solo en este navegador">si cambias de ordenador o de navegador, o borras los datos de navegación, no verás tu campaña. Por eso conviene exportar a menudo.</F>
          </Features>
        </Block>
        <Block title="Moverte por la app">
          <Features>
            <F name="Barra inferior">cada pestaña es una parte de la campaña. En el móvil verás las cuatro principales y el resto (y las herramientas) dentro de <strong>Más</strong>.</F>
            <F name="Volver a la lista de tiendas">dentro de una tienda, pulsa otra vez la pestaña Tiendas para volver a la lista de tiendas.</F>
            <F name="Cabecera">buscador global, calculadora, lanzador de dados, este manual y los ajustes.</F>
            <F name="Temas de color">en <em>Ajustes</em> eliges entre Nellie, Direi, Heaven y Nauthiz.</F>
          </Features>
        </Block>
        <Tip>
          <p><strong className="text-dm-accent">Truco:</strong> el buscador de la cabecera (<Kbd>Ctrl</Kbd>+<Kbd>K</Kbd>) encuentra cualquier cosa de cualquier pestaña. Si un jugador pregunta por un nombre a mitad de sesión, búscalo ahí.</p>
        </Tip>
      </Page>
    )
  },
  {
    id: "party",
    title: "1. Grupo",
    icon: <Users size={18} />,
    content: (
      <Page intro="Las fichas de todos los personajes de tu campaña, separadas en Jugadores, NPCs y Criaturas. Desde aquí los llevas al combate con un clic.">
        <Block title="Crear una ficha">
          <Features>
            <F name="Añadir">elige si es Jugador, NPC o Criatura y rellena lo que necesites. Solo son obligatorios el nombre, la CA, los PV y las seis características.</F>
            <F name="Rasgos y acciones">separa cada uno con una línea en blanco y empieza con su nombre y un punto (<C>Mordisco. Ataque con arma…</C>): el nombre saldrá en negrita. Una línea en mayúsculas, como <C>REACCIONES</C>, crea una sección.</F>
            <F name="Retrato">sube una imagen y encuádrala con el recortador antes de guardarla.</F>
            <F name="Medidas">escribe pies y libras como en el manual; la ficha añade al lado el equivalente en metros y kilos.</F>
          </Features>
        </Block>
        <Block title="Usar las fichas">
          <Features>
            <F name="Puntos de golpe">pulsa los PV de la ficha para abrir el panel rápido de daño y curación (se explica en <em>Iniciativa</em>). La vida es la misma en la ficha y en el combate.</F>
            <F name="Etiquetas">con el botón <strong>+</strong> de la ficha añades etiquetas con descripción («Maldito», «Debe un favor»…). Pulsa una etiqueta para leerla o editarla. Arriba aparecen todas las etiquetas como filtros.</F>
            <F name="Buscar">el buscador de la pestaña mira nombre, raza, clase, desafío y etiquetas. <Kbd>Esc</Kbd> lo borra.</F>
            <F name="Vista de fichas o de lista">cambia entre las fichas completas y una lista compacta. En la vista de fichas puedes colapsarlas todas a la vez.</F>
            <F name="Reordenar">arrastra las fichas para ponerlas en el orden que quieras (mientras filtras no se puede).</F>
          </Features>
        </Block>
        <Block title="Menú de la ficha (⋮)">
          <Features>
            <F name="Copiar ficha">la copia con formato para pegarla en Google Docs, Word o similares.</F>
            <F name="Duplicar">crea una copia para hacer variantes («Bandido» → «Jefe bandido»).</F>
            <F name="Duplicar como criatura enemiga / como NPC aliado">convierte un NPC en enemigo (el aliado que os traiciona) o una criatura en aliada (el lobo que habéis domado), sin perder el original.</F>
          </Features>
        </Block>
        <Block title="Llevar al combate">
          <p className="text-dm-muted">Pulsa el botón de las <strong className="text-dm-text">espadas</strong> de la ficha. La app tira <C>d20 + Destreza</C> por ti, o eliges <strong className="text-dm-text">Manual</strong> y escribes lo que haya sacado el jugador. En las criaturas eliges también la <strong className="text-dm-text">cantidad</strong> (hasta 20) y cada copia entra numerada: Goblin (1), Goblin (2)…</p>
        </Block>
        <Tip>
          <p><strong className="text-dm-accent">Truco:</strong> prepara a los jefes como criaturas guardadas y a los secuaces genéricos lánzalos desde el Bestiario o como temporales en Iniciativa: así tu Grupo no se llena de «Goblin 7».</p>
        </Tip>
      </Page>
    )
  },
  {
    id: "initiative",
    title: "2. Iniciativa y Combate",
    icon: <Swords size={18} />,
    content: (
      <Page intro="El orden de turnos, la vida y los estados de todos los que luchan, siempre ordenados de mayor a menor iniciativa.">
        <Block title="Añadir combatientes">
          <Features>
            <F name="Desde Grupo o Bestiario">con el botón de las espadas de cada ficha (lo más rápido).</F>
            <F name="Desde aquí">el botón <strong>Añadir</strong> te deja elegir a alguien de tu Grupo y escribir su tirada, o crear un combatiente <strong>Temporal</strong> con solo nombre, PV y CA. Los temporales no se guardan en tu Grupo.</F>
            <F name="Cambiar la iniciativa">pulsa el número de la izquierda y escribe otro; la lista se reordena sola. Admite sumas como <C>14+2</C>.</F>
          </Features>
        </Block>
        <Block title="Llevar los turnos">
          <Features>
            <F name="Iniciar Combate">marca el primer turno y empieza la Ronda 1.</F>
            <F name="Siguiente Turno">pasa al siguiente, suma una ronda al volver arriba y descuenta un turno a los estados del que acaba de actuar.</F>
            <F name="Finalizar">termina el combate y vuelve a la Ronda 1. Los combatientes se quedan en la lista por si la pelea continúa.</F>
            <F name="En el móvil">los botones del combate están abajo, al alcance del pulgar.</F>
          </Features>
        </Block>
        <Block title="Daño y curación">
          <p className="text-dm-muted">Pulsa la vida de cualquier combatiente y escribe en el panel:</p>
          <ShortcutTable rows={[
            { keys: <C>-7</C>, text: "Le hace 7 de daño (los PV temporales lo absorben primero)" },
            { keys: <C>+5</C>, text: "Lo cura 5 (sin pasar del máximo)" },
            { keys: <C>20</C>, text: "Le deja la vida en 20" },
            { keys: <C>-(8+3)</C>, text: "También acepta operaciones" },
          ]} />
          <p className="text-dm-muted">Debajo del campo verás cómo quedará la vida antes de pulsar <Kbd>Enter</Kbd>. Los botones del panel aplican la misma cantidad como daño, curación o PV temporales, y <strong className="text-dm-text">Restaurar</strong> lo deja a tope.</p>
          <p className="text-dm-muted">La fila cambia de color según las heridas, late cuando está grave y se tacha al llegar a 0.</p>
        </Block>
        <Block title="Estados y bajas">
          <Features>
            <F name="Estados">pulsa el <strong>+</strong> junto al nombre. Elige uno de los 15 predefinidos (Aturdido, Concentración, Derribado…) o crea el tuyo con descripción y duración en turnos (0 = hasta que lo quites). Pulsa el estado para verlo, editarlo o quitarlo.</F>
            <F name="Concentración">si alguien con el estado <em>Concentración</em> recibe daño, su fila se ilumina en amarillo y te recuerda la tirada de salvación de Constitución con su CD (10 o la mitad del daño, la mayor). Pulsa <strong>Mantiene</strong> o <strong>La pierde</strong> según lo que saque; si pierde, el estado se quita solo. Si recibe varios golpes, verás una CD por cada uno.</F>
            <F name="Ver la ficha">pulsa el nombre de un combatiente para consultar su ficha completa sin salir del combate.</F>
            <F name="Duplicar">los combatientes temporales tienen un botón para clonarlos al momento: perfecto para «aparecen dos más».</F>
            <F name="Cementerio">la calavera saca a un combatiente de la lista y lo guarda en el Cementerio, desde donde puedes devolverlo a la iniciativa o borrarlo.</F>
          </Features>
        </Block>
        <Tip>
          <p><strong className="text-dm-accent">Truco:</strong> pon el estado <em>Concentración</em> en cuanto alguien lance un conjuro que la requiera. Así la app te avisará de la tirada en cuanto reciba daño, también si se lo quitas desde su ficha en Grupo.</p>
        </Tip>
      </Page>
    )
  },
  {
    id: "quests",
    title: "3. Misiones",
    icon: <Target size={18} />,
    content: (
      <Page intro="Las tramas de tu campaña en forma de árbol: cada misión puede abrir ramas con sus submisiones, para ver de un vistazo qué camino ha seguido el grupo.">
        <Block title="Organizar las tramas">
          <Features>
            <F name="Nueva Misión">ponle título, lugar, descripción, recompensa e imagen. En <strong>Misión Anterior (Rama)</strong> eliges de qué misión cuelga; déjalo vacío para una trama principal.</F>
            <F name="Submisiones">el botón <strong>+</strong> de la parte inferior de una misión crea una submisión enlazada a ella.</F>
            <F name="Plegar ramas">la flecha lateral oculta o muestra las submisiones para centrarte en lo que importa.</F>
          </Features>
        </Block>
        <Block title="Durante la partida">
          <Features>
            <F name="Estado">pulsa el círculo junto al título para cambiarlo: <span className="text-dm-text">Activa</span> → <span className="text-green-500">Completada</span> → <span className="text-dm-danger">Fallida</span>.</F>
            <F name="Detalles y notas">con <strong>+ Añadir</strong> guardas pistas, notas o recompensas extra dentro de cada misión, sin ensuciar la descripción.</F>
            <F name="Vista completa">pulsa la misión para abrirla en grande, ideal para leer en voz alta el encargo a tus jugadores.</F>
          </Features>
        </Block>
        <Tip>
          <p><strong className="text-dm-accent">Truco:</strong> marca como <em>Fallida</em> en vez de borrar. El árbol se convierte en el registro de las decisiones del grupo y te da ganchos para más adelante.</p>
        </Tip>
      </Page>
    )
  },
  {
    id: "maps",
    title: "4. Mapas y Lugares",
    icon: <MapIcon size={18} />,
    content: (
      <Page intro="Tu mundo por capas: continente › reino › ciudad › taberna. Cada lugar puede tener su propio mapa con marcadores que llevan a los lugares que contiene.">
        <Block title="Construir el mundo">
          <Features>
            <F name="Añadir lugar">con nombre, una etiqueta corta (Taberna, Costa de la Espada…), descripción y, si quieres, una imagen de fondo que hará de mapa.</F>
            <F name="Entrar y salir">pulsa un lugar para entrar en él. La ruta de arriba te devuelve a cualquier nivel anterior.</F>
            <F name="Explorar el mapa">arrastra para moverte y usa los botones <strong>+</strong> y <strong>−</strong> para el zoom; el botón central lo reinicia.</F>
          </Features>
        </Block>
        <Block title="Marcadores">
          <Steps>
            <li>Dentro de un lugar con mapa, busca en la lista el sublugar que quieres situar.</li>
            <li>Pulsa su botón de <strong className="text-dm-text">marcador</strong> y haz clic en el punto del mapa donde está.</li>
            <li>Desde entonces, pulsar el marcador en el mapa te lleva directamente a ese lugar.</li>
          </Steps>
        </Block>
        <Tip>
          <p><strong className="text-dm-accent">Truco:</strong> las imágenes se guardan dentro de la app y ocupan espacio. Usa mapas comprimidos (JPG o WebP) y vigila el indicador de <em>Capacidad</em> de esta pestaña.</p>
        </Tip>
      </Page>
    )
  },
  {
    id: "shops",
    title: "5. Tiendas",
    icon: <Store size={18} />,
    content: (
      <Page intro="Mercaderes con su inventario y sus precios, listos para enseñárselos al grupo cuando entre por la puerta.">
        <Block title="Tiendas base">
          <p className="text-dm-muted">La app trae una tienda general, una herrería y un alquimista ya surtidos con los precios del manual. Siempre salen las primeras y no se pueden editar, pero puedes <strong className="text-dm-text">duplicarlas</strong> para tener tu propia versión editable, u ocultarlas todas con el botón del <strong className="text-dm-text">ojo</strong> de la barra superior.</p>
        </Block>
        <Block title="Tus tiendas">
          <Features>
            <F name="Nueva Tienda">nombre del local, del mercader e imagen, con vista previa de cómo quedará la tarjeta.</F>
            <F name="Objetos">nombre, precio (<C>50 po</C>), descripción, imagen y categoría opcional.</F>
            <F name="Categorías">los objetos con la misma categoría salen juntos en su propia sección. Puedes renombrar las secciones y subirlas o bajarlas.</F>
            <F name="Buscar">cada tienda tiene su buscador para encontrar un objeto en inventarios largos.</F>
          </Features>
        </Block>
        <Tip>
          <p><strong className="text-dm-accent">Truco:</strong> el <strong>ojo</strong> de cada objeto lo oculta a los jugadores sin borrarlo. Úsalo para lo que se ha agotado o para el «género especial» que el mercader solo saca si le caéis bien.</p>
        </Tip>
      </Page>
    )
  },
  {
    id: "notes",
    title: "6. Notas",
    icon: <StickyNote size={18} />,
    content: (
      <Page intro="Tu libreta de campaña, pensada para apuntar rápido en plena sesión y encontrarlo todo después.">
        <Block title="Escribir">
          <Features>
            <F name="Nota rápida">pulsa <Kbd>N</Kbd>, escribe y <Kbd>Enter</Kbd>. Las palabras con <C>#</C> (<C>#villano</C>) se convierten en etiquetas. Con <Kbd>Mayús</Kbd>+<Kbd>Enter</Kbd> la abres en el editor completo.</F>
            <F name="Tipos con plantilla">General, PNJ, Lugar, Pista / Secreto, Botín, Regla, Sesión y Gancho. Cada tipo trae una plantilla con los campos útiles ya escritos.</F>
            <F name="Formato">usa los botones del editor o escribe <C>**negrita**</C>, <C>## título</C>, <C>- lista</C> y <C>&gt; texto</C> para leer en voz alta. También hay tablas.</F>
            <F name="Colores">Pergamino, Sangre, Bosque, Arcano, Oro, Hechizo, Jade o Ceniza, para reconocer cada nota de un vistazo.</F>
          </Features>
        </Block>
        <Block title="Notas que hacen cosas">
          <Features>
            <F name="Tiradas">cualquier tirada escrita (<C>1d20+5</C>, <C>2d6</C>…) se lanza con un clic y el resultado aparece en pantalla.</F>
            <F name="Casillas">escribe <C>- [ ] Encontrar la llave</C> y márcala con un clic sin entrar a editar. La nota muestra cuántas llevas hechas.</F>
          </Features>
        </Block>
        <Block title="Ordenar y encontrar">
          <Features>
            <F name="Buscar">pulsa <Kbd>/</Kbd> y escribe, o busca <C>#etiqueta</C>. Pulsar una etiqueta muestra todas las notas que la llevan.</F>
            <F name="Filtros y orden">filtra por tipo y ordena de forma manual, por recientes o de la A a la Z. En orden manual, arrastra las notas para colocarlas.</F>
            <F name="Fijar">las notas fijadas salen siempre arriba (<Kbd>P</Kbd> al verlas).</F>
          </Features>
        </Block>
        <Tip>
          <p><strong className="text-dm-accent">Truco:</strong> crea una nota de tipo <em>Sesión</em> para cada partida y etiqueta lo importante (<C>#pista</C>, <C>#deuda</C>). Antes de la siguiente sesión, buscar la etiqueta te da el resumen. Pulsa <Kbd>?</Kbd> en Notas para la guía completa con ejemplos que puedes probar.</p>
        </Tip>
      </Page>
    )
  },
  {
    id: "items",
    title: "7. Objetos y Botín",
    icon: <Backpack size={18} />,
    content: (
      <Page intro="El catálogo de objetos del manual, tus objetos propios y las tablas de botín para repartir tesoros al momento.">
        <Block title="Las tres pestañas">
          <Features>
            <F name="Objetos">el equipo y los objetos mágicos del SRD en español. Filtra por categoría, rareza y sintonización. Con <strong>Añadir a Homebrew</strong> te guardas una copia editable.</F>
            <F name="Homebrew">tus objetos: nombre, resumen, color de rareza, imagen y detalles opcionales (precio, peso, daño, CA, propiedades, sintonización). Se pueden reordenar arrastrándolos.</F>
            <F name="Tablas de Botín">tablas que tiran el dado por ti y te dicen qué ha caído.</F>
          </Features>
        </Block>
        <Block title="Crear una tabla de botín">
          <Features>
            <F name="Modo Lista">añade objetos del catálogo o de tu homebrew con <strong>Añadir objetos</strong> (cada clic sube su probabilidad), o escribe resultados de texto (<C>1000 po</C>). Ajusta el porcentaje de cada resultado.</F>
            <F name="Modo Texto">un resultado por línea. Repite una línea para que salga más a menudo.</F>
            <F name="Dado">en <strong>Auto</strong> la app elige el dado más pequeño que respeta tus porcentajes, o eliges tú uno concreto.</F>
          </Features>
          <p className="text-dm-muted">Para tirar, abre la tabla y pulsa <strong className="text-dm-text">Tirar</strong>. Si el resultado es un objeto, púlsalo para ver su descripción.</p>
        </Block>
        <Tip>
          <p><strong className="text-dm-accent">Truco:</strong> haz una tabla por tipo de encuentro («Bolsillos de bandido», «Guarida de dragón») y tendrás el botín resuelto en un segundo, sin consultar el manual.</p>
        </Tip>
      </Page>
    )
  },
  {
    id: "grimoire",
    title: "8. Grimorio",
    icon: <BookOpen size={18} />,
    content: (
      <Page intro="Los conjuros de la 5ª edición en español, con sus datos y su descripción completa.">
        <Block title="Encontrar un conjuro">
          <Features>
            <F name="Buscar">por nombre.</F>
            <F name="Filtros">por nivel (o trucos), escuela de magia y clase que puede lanzarlo.</F>
            <F name="Orden">por nivel ascendente o descendente, o por nombre.</F>
          </Features>
        </Block>
        <Block title="La ficha del conjuro">
          <p className="text-dm-muted">Nivel, escuela, tiempo de lanzamiento, alcance (con su equivalente en metros), componentes y duración, la descripción completa y qué cambia al lanzarlo a niveles superiores.</p>
        </Block>
        <Tip>
          <p><strong className="text-dm-accent">Truco:</strong> pulsa la <strong>estrella</strong> de los conjuros de tus jugadores y de tus villanos y elige el orden <em>Solo guardados</em>. En combate tendrás a mano solo los que importan.</p>
        </Tip>
      </Page>
    )
  },
  {
    id: "bestiary",
    title: "9. Bestiario",
    icon: <Skull size={18} />,
    content: (
      <Page intro="Las más de 300 criaturas del SRD 5.1 en español, con su bloque de estadísticas completo y listas para el combate.">
        <Block title="Encontrar una criatura">
          <Features>
            <F name="Buscar">por nombre, también en inglés («owlbear» encuentra al oso lechuza).</F>
            <F name="Filtros">por desafío, tipo y tamaño, y orden por nombre o desafío.</F>
          </Features>
        </Block>
        <Block title="Desde la ficha">
          <Features>
            <F name="Al combate">elige cuántas quieres y si la iniciativa la tira la app (<C>d20 + Destreza</C>) o la escribes tú. Cada copia entra numerada.</F>
            <F name="Guardar en tus criaturas">crea una copia editable en <em>Grupo › Criaturas</em> para adaptarla a tu campaña (más vida, otro nombre, acciones nuevas…).</F>
            <F name="Copiar">copia la ficha como tabla para pegarla en Google Docs, Word o similares.</F>
          </Features>
        </Block>
        <Tip>
          <p><strong className="text-dm-accent">Truco:</strong> marca con la <strong>estrella</strong> las criaturas del capítulo que vas a jugar y ordena por <em>Solo guardados</em>: tu bestiario de la sesión en una sola lista.</p>
        </Tip>
      </Page>
    )
  },
  {
    id: "tools",
    title: "10. Herramientas y Copias",
    icon: <Wrench size={18} />,
    content: (
      <Page intro="Utilidades que están siempre disponibles en la cabecera, estés en la pestaña que estés.">
        <Block title="Buscador global">
          <Features>
            <F name="Busca en todo">fichas, combate, misiones, mapas, tiendas, notas, objetos, tablas, conjuros y criaturas a la vez.</F>
            <F name="Vista rápida">al elegir un resultado lo ves en una ventana sin cambiar de pestaña. Desde ahí, <strong>Ir a…</strong> te lleva a su sitio y lo resalta.</F>
          </Features>
        </Block>
        <Block title="Dados y calculadora">
          <Features>
            <F name="Lanzador de dados">elige el dado y la cantidad (hasta 12) y tira. Guarda un historial de las últimas tiradas.</F>
            <F name="Calculadora">para repartir oro, sumar daño o lo que surja, sin salir de la app.</F>
          </Features>
        </Block>
        <Block title="Copias de seguridad">
          <Features>
            <F name="Exportar Todo">en <em>Ajustes</em> descarga un archivo con toda la campaña. Úsalo como copia de seguridad o para pasarla a otro ordenador.</F>
            <F name="Importar">al cargar un archivo eliges <strong>Fusionar</strong> (añade lo nuevo a lo que ya tienes) o <strong>Sobrescribir</strong> (lo reemplaza todo).</F>
            <F name="Por pestañas">Grupo, Misiones, Mapas, Tiendas, Notas y Objetos tienen sus propios botones de exportar e importar. Así puedes pasar a otro máster solo tus criaturas o tus tiendas sin destriparle la trama.</F>
          </Features>
        </Block>
        <Tip>
          <p><strong className="text-dm-accent">Importante:</strong> si borras los datos de navegación, usas el modo incógnito o cambias de navegador, la campaña no estará. Exporta al final de cada sesión y guarda el archivo en tu nube o en un USB.</p>
        </Tip>
      </Page>
    )
  },
  {
    id: "shortcuts",
    title: "Atajos de teclado",
    icon: <Keyboard size={18} />,
    content: (
      <Page intro="Con teclado vas más rápido. Estos son todos los atajos de la app.">
        <Block title="En cualquier pestaña">
          <ShortcutTable rows={[
            { keys: <><Kbd>Ctrl</Kbd>+<Kbd>K</Kbd></>, text: "Abrir el buscador global" },
            { keys: <><Kbd>↑</Kbd><Kbd>↓</Kbd></>, text: "Moverte por los resultados de la búsqueda" },
            { keys: <Kbd>Enter</Kbd>, text: "Vista rápida del resultado elegido" },
            { keys: <><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd></>, text: "Ir directamente al resultado" },
            { keys: <Kbd>Esc</Kbd>, text: "Cerrar ventanas y borrar búsquedas" },
          ]} />
        </Block>
        <Block title="En Notas">
          <ShortcutTable rows={[
            { keys: <Kbd>N</Kbd>, text: "Escribir una nota rápida" },
            { keys: <Kbd>/</Kbd>, text: "Buscar en las notas" },
            { keys: <Kbd>?</Kbd>, text: "Abrir la guía de formato" },
            { keys: <><Kbd>Mayús</Kbd>+<Kbd>Enter</Kbd></>, text: "Pasar la nota rápida al editor" },
            { keys: <><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd></>, text: "Guardar en el editor" },
            { keys: <><Kbd>←</Kbd><Kbd>→</Kbd></>, text: "Nota anterior o siguiente" },
            { keys: <Kbd>E</Kbd>, text: "Editar la nota abierta (o doble clic en el texto)" },
            { keys: <Kbd>P</Kbd>, text: "Fijar la nota abierta" },
          ]} />
        </Block>
        <Block title="En combate y en las fichas">
          <ShortcutTable rows={[
            { keys: <><C>-5</C> <C>+5</C></>, text: "Daño o curación en el panel de PV, y Enter" },
            { keys: <Kbd>Enter</Kbd>, text: "Confirmar una iniciativa escrita a mano" },
          ]} />
        </Block>
      </Page>
    )
  },
  {
    id: "legal",
    title: "Legal y Privacidad",
    icon: <ScrollText size={18} />,
    content: (
      <div className="space-y-4 text-sm text-dm-text leading-relaxed">
        <div className="bg-dm-bg p-4 border border-dm-accent/30 rounded-sm space-y-2">
          <h4 className="text-dm-accent font-bold mb-2 uppercase tracking-wider text-xs">Política de Privacidad</h4>
          <p>Esta aplicación funciona bajo un modelo <strong>Local-First</strong>. No pedimos registro, no recopilamos datos personales y no los enviamos a ningún servidor. Toda la información de tus partidas, personajes, notas e imágenes se guarda <strong>solo en tu navegador</strong> mediante <code>localStorage</code> e <code>IndexedDB</code>.</p>
          <p><strong>Cookies y almacenamiento:</strong> no usamos cookies, analítica, publicidad ni rastreadores. El almacenamiento local solo sirve para que la app funcione y guarde lo que tú escribes, por eso no hace falta pedir consentimiento. Puedes borrarlo cuando quieras desde los ajustes de tu navegador (perderás tus datos si no los has exportado).</p>
          <p><strong>Alojamiento:</strong> la web se sirve desde Vercel (Vercel Inc.). Como cualquier servidor web, Vercel puede registrar datos técnicos de la visita, como la dirección IP, para entregar la página y protegerla frente a abusos. Esto se rige por su propia <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-dm-accent underline">política de privacidad</a>. Las tipografías se sirven desde esta misma web, sin pasar por Google ni por otros servicios.</p>
        </div>
        <div className="bg-dm-bg p-4 border border-dm-accent/30 rounded-sm">
          <h4 className="text-dm-accent font-bold mb-2 uppercase tracking-wider text-xs">Aviso Legal y Exención de Responsabilidad</h4>
          <p>NDMScreen es un proyecto gratuito y sin ánimo de lucro. Dado que los datos residen únicamente en tu dispositivo, el desarrollador no se hace responsable de la pérdida accidental de datos producida por borrar la caché, restablecer el navegador o usar modos incógnito/privados. <strong>Te recomendamos encarecidamente utilizar la función de Exportar Datos periódicamente para mantener copias de seguridad de tus campañas.</strong> El servicio se ofrece "tal cual", sin garantías de ningún tipo. Cada usuario es responsable del contenido (textos e imágenes) que introduce en su propio navegador.</p>
        </div>
        <div className="bg-dm-bg p-4 border border-dm-accent/30 rounded-sm space-y-2">
          <h4 className="text-dm-accent font-bold mb-2 uppercase tracking-wider text-xs">Contenido de Juego y Licencias</h4>
          <p>NDMScreen es una herramienta de fans compatible con la quinta edición. No está afiliada, respaldada, patrocinada ni aprobada por Wizards of the Coast LLC. Las marcas mencionadas pertenecen a sus respectivos propietarios.</p>
          <p><strong>Objetos mágicos:</strong> {CC_BY_ATTRIBUTION}</p>
          <p><strong>Bestiario y equipo no mágico:</strong> proceden del SRD 5.1 en español de Nosolorol Ediciones (traducción de Ana Navalón), distribuido bajo la Open Game License v1.0a. La criatura «Draña», que falta en esa versión, está traducida por NDMScreen del SRD 5.1 en inglés.</p>
          <p><strong>Contenido de Juego Abierto (sección 8 de la OGL):</strong> se declara Open Game Content el texto de las fichas de criaturas del Bestiario y el del equipo no mágico de la sección Objetos. El resto de la aplicación no es Open Game Content: su nombre, código, diseño, textos de la interfaz, tiendas e ilustraciones.</p>
          <details>
            <summary className="cursor-pointer text-dm-accent hover:text-dm-accent-hover select-none">Ver la Open Game License v1.0a completa</summary>
            <div className="mt-2 space-y-2 text-xs text-dm-muted break-words">
              <p className="font-bold text-dm-text">OPEN GAME LICENSE Version 1.0a</p>
              {OGL_SECTIONS.map((p) => <p key={p.slice(0, 32)}>{p}</p>)}
              <p className="font-bold text-dm-text">15. COPYRIGHT NOTICE</p>
              {OGL_COPYRIGHT_NOTICE.map((p) => <p key={p.slice(0, 32)}>{p}</p>)}
            </div>
          </details>
        </div>
        <div className="bg-dm-bg p-4 border border-dm-accent/30 rounded-sm space-y-2">
          <h4 className="text-dm-accent font-bold mb-2 uppercase tracking-wider text-xs">Créditos</h4>
          <p>Ilustraciones de los mercaderes y diseño de la aplicación: © NDMScreen. Todos los derechos reservados.</p>
          <ul className="list-disc pl-5 space-y-1 text-dm-muted">
            {CREDITS.map((c) => <li key={c.name}>{c.name}: <span className="text-dm-text">{c.license}</span></li>)}
          </ul>
        </div>
      </div>
    )
  }

];

export function FullTutorialModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [activeSection, setActiveSection] = useState(TUTORIAL_SECTIONS[0].id);

  return (
    <Overlay isOpen={isOpen} onClose={onClose} zIndex="z-[100]">
      <div role="dialog" aria-modal="true" className="bg-dm-bg/80 backdrop-blur-xl gecko:backdrop-filter-none gecko:bg-dm-bg/95 border border-dm-accent/30 rounded-xl max-w-4xl w-full h-full sm:h-[80vh] shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-black/40 border-b md:border-b-0 md:border-r border-dm-accent/10 flex flex-col shrink-0">
          <div className="p-4 border-b border-dm-accent/10 flex justify-between items-center bg-black/40">
            <h2 className="text-dm-accent font-bold tracking-widest uppercase text-sm flex items-center gap-2">
              <HelpCircle size={16} /> Manual del Máster
            </h2>
            <button onClick={onClose} className="md:hidden text-dm-muted hover:text-dm-accent">
              <X size={20} />
            </button>
          </div>
          
          {/* Horizontal chips on phones, vertical list from md up. */}
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto md:flex-1 custom-scrollbar p-2">
            {TUTORIAL_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={cn(
                  "shrink-0 md:w-full text-left px-3 py-2 md:py-3 rounded-sm flex items-center gap-2 md:gap-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap",
                  activeSection === sec.id 
                    ? "bg-dm-accent/10 text-dm-accent border border-dm-accent/30" 
                    : "text-dm-muted hover:bg-dm-bg-hover hover:text-dm-text border border-transparent"
                )}
              >
                {sec.icon}
                <span className="flex-1 truncate">{sec.title}</span>
                {activeSection === sec.id && <ChevronRight size={14} className="hidden md:block" />}
              </button>
            ))}
          </div>
          <div className="hidden md:block p-3 border-t border-dm-border text-left mt-auto">
            <span className="text-[10px] text-dm-muted opacity-40 font-mono tracking-wider select-none">NDMScreen 1.1 | © Bayonora |</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <button onClick={onClose} className="hidden md:flex absolute top-4 right-4 text-dm-muted hover:text-dm-text-bright transition-colors z-10 bg-dm-bg p-1 rounded-sm border border-dm-border">
            <X size={20} />
          </button>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-10 relative z-0">
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
                      <h3 className="text-lg sm:text-2xl font-light tracking-widest uppercase text-dm-text-bright">
                        {sec.title}
                      </h3>
                    </div>
                    
                    <div className="max-w-none">
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
    </Overlay>
  );
}
