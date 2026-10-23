import React, { useState, useEffect, useMemo } from "react";
import { useStore, actions } from "../store/useStore";
import { ViewHeader, ToolbarButton } from "../components/ui/ViewHeader";
import { ImportExportActions, arrayOrKey } from "../components/ImportExportActions";
import { downloadJSON, normalizeSearchText } from "../lib/utils";
import { Modal } from "../components/ui/Modal";
import { Button, Input, Textarea } from "../components/ui/Input";
import { Markdown } from "../components/ui/Markdown";
import { Shop, ShopItem } from "../types";
import { Plus, Trash2, Edit2, Store as StoreIcon, EyeOff, Eye, Image as ImageIcon, ArrowLeft, X, Copy, Lock, Search } from "lucide-react";
import { compressImage, cn } from "../lib/utils";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { SortableGrid } from "../components/SortableGrid";
import { ImageCropperModal } from "../components/ImageCropperModal";
import { readFileAsDataURL } from "../lib/utils";
import { showToast } from "../components/Toasts";
import { useShops, isBuiltinShop, shopIcon, SHOP_KINDS } from "../lib/shops";

export function ViewShops() {
  const userShops = useStore((state) => state.shops);
  const { all, visible, hideBuiltin } = useShops();
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  // Opened from the global search ("Ir a la tienda").
  const openShopId = useStore((state) => state.uiState.openShopId);
  useEffect(() => {
    if (!openShopId) return;
    setSelectedShopId(openShopId);
    actions.updateUI({ openShopId: undefined });
  }, [openShopId]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editShopData, setEditShopData] = useState<Shop | null>(null);
  const [deleteShopId, setDeleteShopId] = useState<string | null>(null);

  const selectedShop = all.find((s) => s.id === selectedShopId);

  const handleEditShop = (s: Shop, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditShopData(s);
    setIsAddOpen(true);
  };

  const handleDeleteShop = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteShopId(id);
  };

  /** Copies the shop; from inside a shop the copy opens at once, from the grid a toast offers it. */
  const duplicate = (s: Shop, open: boolean) => {
    const id = actions.duplicateShop(s, all.map((x) => x.id));
    if (open) {
      setSelectedShopId(id);
      showToast(`Copia de ${s.name} creada. Esta sí se puede editar.`);
    } else {
      showToast(`Copia de ${s.name} creada.`, { label: "Abrir", onClick: () => setSelectedShopId(id) });
    }
  };

  // The grid may show only part of the shops (fixed ones hidden): the moved ones fill the slots
  // of the visible shops and the hidden ones keep their place.
  const handleReorder = (moved: Shop[]) => {
    const shown = new Set(visible.map((s) => s.id));
    let k = 0;
    actions.setShopOrder(all.map((s) => (shown.has(s.id) ? moved[k++].id : s.id)));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ViewHeader
        icon={StoreIcon}
        title={selectedShop ? selectedShop.name : "Tiendas"}
        actions={
          selectedShop ? (
            <>
              <ToolbarButton icon={Copy} label="Duplicar Tienda" onClick={() => duplicate(selectedShop, true)} />
              <ToolbarButton icon={ArrowLeft} label="Volver a Tiendas" showLabel="always" onClick={() => setSelectedShopId(null)} />
            </>
          ) : (
            <>
              <ToolbarButton
                icon={hideBuiltin ? Eye : EyeOff}
                label={hideBuiltin ? "Mostrar tiendas base" : "Ocultar tiendas base"}
                onClick={() => actions.updateUI({ hideBuiltinShops: !hideBuiltin })}
              />
              <ImportExportActions
                noun="Tiendas"
                onExport={() => downloadJSON(userShops, "ndms_tiendas.json")}
                parse={arrayOrKey("shops")}
                onImport={(items, mode) => actions.importCollection("shops", items, mode)}
                invalidMessage="El archivo no parece contener tiendas válidas."
              />
              <ToolbarButton icon={Plus} label="Nueva Tienda" shortLabel="Nueva" variant="primary" showLabel="always" onClick={() => { setEditShopData(null); setIsAddOpen(true); }} />
            </>
          )
        }
      />

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-12 sm:pb-16 custom-scrollbar relative">
        {!selectedShop ? (
          <>
          <SortableGrid
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
          items={visible}
          onReorder={handleReorder}
          renderItem={(s) => {
            const builtin = isBuiltinShop(s.id);
            const KindIcon = shopIcon(s);
            const kindLabel = s.kind && SHOP_KINDS[s.kind]?.label;
            return (
            <div
              data-search-id={s.id}
              className="bg-dm-bg-darker group active:scale-[0.98] border border-dm-border overflow-hidden cursor-pointer hover:border-dm-accent hover:shadow-[0_0_15px_var(--theme-glow)] transition-all duration-300 flex flex-col shadow-lg shadow-black/80 relative"
              onClick={() => setSelectedShopId(s.id)}
            >
              {/* Área de Imagen / Banner */}
              <div className="relative h-48 w-full overflow-hidden bg-dm-bg-darker">
                {s.ownerImage ? (
                  <>
                    <img src={s.previewImage || s.ownerImage} alt={s.ownerName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" />
                    <div className="absolute inset-0 bg-gradient-to-t from-dm-bg-darker via-dm-bg-darker/40 to-transparent"></div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <KindIcon size={48} className="text-dm-border mb-2 group-hover:text-dm-border-focus transition-colors duration-500" />
                    <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-dm-bg-darker to-transparent"></div>
                  </div>
                )}

                {/* Tipo de tienda; las tiendas base llevan candado */}
                {(builtin || kindLabel) && (
                  <div
                    className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-dm-bg-darker/90 backdrop-blur-sm border border-dm-border text-[10px] uppercase tracking-widest text-dm-muted"
                    title={builtin ? "Tienda base: no se puede editar ni borrar. Duplícala para tener tu versión." : undefined}
                  >
                    {builtin && <Lock size={11} className="text-dm-accent" />}
                    {kindLabel || "Tienda base"}
                  </div>
                )}

                {/* Botones de Acción Superpuestos */}
                <div className="absolute top-3 right-3 flex gap-2 can-hover:opacity-0 group-hover:opacity-100 transition-all duration-300 can-hover:-translate-y-2.5 group-hover:translate-y-0">
                  {!builtin && (
                    <button
                      onClick={(e) => handleEditShop(s, e)}
                      className="p-2 bg-dm-bg-darker/90 backdrop-blur-sm border border-dm-border text-dm-muted hover:text-dm-accent hover:border-dm-accent transition-all duration-200"
                      title="Editar Tienda"
                    >
                      <Edit2 size={16}/>
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); duplicate(s, false); }}
                    className="p-2 bg-dm-bg-darker/90 backdrop-blur-sm border border-dm-border text-dm-muted hover:text-dm-accent hover:border-dm-accent transition-all duration-200"
                    title="Duplicar Tienda"
                  >
                    <Copy size={16}/>
                  </button>
                  {!builtin && (
                    <button
                      onClick={(e) => handleDeleteShop(s.id, e)}
                      className="p-2 bg-dm-bg-darker/90 backdrop-blur-sm border border-dm-border text-dm-muted hover:text-dm-danger hover:border-dm-danger transition-all duration-200"
                      title="Eliminar Tienda"
                    >
                      <Trash2 size={16}/>
                    </button>
                  )}
                </div>
              </div>

              {/* Contenido de la Tarjeta */}
              <div className="p-4 sm:p-6 flex-1 flex flex-col relative">
                 <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-dm-border to-transparent opacity-50"></div>

                 <h3 className="font-display text-xl tracking-wide text-dm-text-muted group-hover:text-dm-accent transition-colors duration-300 mb-1 line-clamp-1">{s.name}</h3>

                 <div className="flex items-center gap-2 mb-4">
                   <div className="h-[1px] w-4 bg-dm-accent/50"></div>
                   <p className="text-[10px] uppercase tracking-[0.2em] text-dm-muted truncate">{s.ownerName || "Comerciante Anónimo"}</p>
                 </div>

                 {/* Stats o Inventario Inferior */}
                 <div className="mt-auto flex items-center justify-between pt-5 border-t border-dm-border/30">
                    <span className="text-xs uppercase tracking-widest text-dm-muted-alt">Inventario</span>
                    <div className="flex items-center gap-1.5 bg-dm-bg-darker border border-dm-border px-2 py-1 rounded-sm">
                      <StoreIcon size={12} className="text-dm-accent" />
                      <span className="text-xs font-mono text-dm-accent">{(s.items || []).filter((it) => !it.hidden).length}</span>
                    </div>
                 </div>
              </div>

              {/* Brillo en hover */}
              <div className="absolute inset-0 border border-dm-accent opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none"></div>
            </div>
            );
          }}
        />
            {visible.length === 0 && (
              <p className="text-dm-text opacity-50 text-center py-10 col-span-full ">
                {hideBuiltin ? "No tienes tiendas propias. Crea una o vuelve a mostrar las tiendas base." : "No hay tiendas. Crea una para añadir objetos."}
              </p>
            )}
          </>
        ) : (
          <ShopInventory shop={selectedShop} onDuplicate={() => duplicate(selectedShop, true)} />
        )}
      </div>



      <AddShopModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} editData={editShopData} />
      <ConfirmDeleteModal
        isOpen={!!deleteShopId}
        onClose={() => setDeleteShopId(null)}
        onConfirm={() => { if (deleteShopId) actions.deleteShop(deleteShopId); setDeleteShopId(null); }}
        title="Eliminar Tienda"
        message="¿Estás seguro de que quieres eliminar esta tienda permanentemente?"
      />
    </div>
  );
}

function ShopInventory({ shop, onDuplicate }: { shop: Shop; onDuplicate: () => void }) {
  const readOnly = isBuiltinShop(shop.id);
  const KindIcon = shopIcon(shop);
  const kindLabel = shop.kind && SHOP_KINDS[shop.kind]?.label;
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editItemData, setEditItemData] = useState<ShopItem | null>(null);
  const [viewItem, setViewItem] = useState<ShopItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const q = normalizeSearchText(filter).trim();
  // Hidden items never match the filter, so searching doesn't give away what they are.
  const items = useMemo(
    () => (q ? shop.items.filter((it) => !it.hidden && normalizeSearchText(`${it.name} ${it.price}`).includes(q)) : shop.items),
    [shop.items, q]
  );
  const hiddenCount = shop.items.filter((it) => it.hidden).length;

  const handleEdit = (item: ShopItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditItemData(item);
    setIsAddItemOpen(true);
  };

  const handleToggleHide = (item: ShopItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) actions.toggleBuiltinItemHidden(item.id);
    else actions.updateShopItem(shop.id, item.id, { hidden: !item.hidden });
  };

  const handleDelete = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteItemId(itemId);
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 sm:gap-8 relative z-10 w-full pb-20">

      {/* Columna Izquierda: Lista de Objetos (Inventario) */}
      <div className="flex-1 flex flex-col gap-6 order-2 lg:order-1">
        <div className="flex flex-col gap-4 bg-dm-bg/90 p-4 sm:p-6 border border-dm-border shadow-lg shadow-black/50 rounded-sm">
          <div className="flex justify-between items-center gap-3">
            <div>
              <h2 className="text-lg sm:text-2xl font-display text-dm-accent uppercase tracking-widest">Inventario</h2>
              <p className="text-xs uppercase tracking-widest text-dm-text opacity-70 mt-1">{shop.items.length - hiddenCount} Objetos Disponibles{hiddenCount > 0 && ` · ${hiddenCount} ${hiddenCount === 1 ? "oculto" : "ocultos"}`}</p>
            </div>
            {readOnly ? (
              <Button variant="ghost" onClick={onDuplicate} title="Crea una copia editable de esta tienda">
                <Copy size={14} className="mr-1" /> Duplicar para editar
              </Button>
            ) : (
              <Button onClick={() => { setEditItemData(null); setIsAddItemOpen(true); }}>
                <Plus size={14} className="mr-1" /> Añadir Objeto
              </Button>
            )}
          </div>
          {readOnly && (
            <p className="flex items-start gap-2 text-xs text-dm-muted">
              <Lock size={13} className="text-dm-accent shrink-0 mt-px" />
              Tienda base con los precios del manual. No se puede editar ni borrar, pero sí ocultar objetos con el ojo; duplícala si quieres cambiar más.
            </p>
          )}
          {shop.items.length > 8 && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dm-muted pointer-events-none" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar en el inventario…"
                aria-label="Buscar en el inventario"
                className="w-full h-9 pl-9 pr-8 bg-dm-bg-darker border border-dm-border text-sm text-dm-text-bright placeholder:text-dm-muted focus:outline-none focus:border-dm-accent"
              />
              {filter && (
                <button type="button" onClick={() => setFilter("")} aria-label="Borrar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-dm-muted hover:text-dm-accent">
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {shop.items.length === 0 && (
            <div className="p-10 text-center border border-dashed border-dm-border bg-dm-bg/50 text-dm-muted text-sm tracking-widest uppercase">
              El inventario está vacío
            </div>
          )}
          {shop.items.length > 0 && items.length === 0 && (
            <div className="p-6 text-center text-dm-muted text-sm italic">Nada coincide con «{filter}».</div>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              data-search-id={item.id}
              className={cn(
                "flex items-center justify-between gap-2 p-3 sm:p-4 border transition-all shadow-md shadow-black/30",
                item.hidden
                  ? "bg-dm-bg-darker/60 border-dm-border/50"
                  : "bg-dm-bg/90 border-dm-border hover:border-dm-accent cursor-pointer backdrop-blur-sm"
              )}
              onClick={() => !item.hidden && setViewItem(item)}
            >
              {item.hidden ? (
                <div className="flex items-center gap-4 opacity-30">
                  <div className="w-12 h-12 bg-black border border-dm-bg-darker flex items-center justify-center">
                    <EyeOff size={20} className="text-dm-border" />
                  </div>
                  <div>
                    <h3 className="font-bold text-dm-muted">Objeto oculto</h3>
                    <p className="text-xs text-dm-muted-alt">Los jugadores no lo ven</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 min-w-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-12 h-12 object-cover border border-dm-border rounded-sm shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-dm-bg-darker border border-dm-border flex items-center justify-center rounded-sm shrink-0">
                      <ImageIcon className="text-dm-accent opacity-30" size={20} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-dm-accent text-lg font-display">{item.name}</h3>
                    <p className="text-xs text-dm-muted font-mono">{item.price}</p>
                  </div>
                </div>
              )}

              <div className="flex sm:gap-2 shrink-0">
                <button
                  onClick={(e) => handleToggleHide(item, e)}
                  className={cn("p-2", item.hidden ? "text-dm-accent" : "text-dm-border hover:text-dm-accent")}
                  title={item.hidden ? "Mostrar a los jugadores" : "Ocultar a los jugadores"}
                  aria-label={item.hidden ? "Mostrar a los jugadores" : "Ocultar a los jugadores"}
                >
                  {item.hidden ? <Eye size={16}/> : <EyeOff size={16}/>}
                </button>
                {!readOnly && (
                  <>
                    <button onClick={(e) => handleEdit(item, e)} className="p-2 text-dm-border hover:text-dm-accent">
                      <Edit2 size={16}/>
                    </button>
                    <button onClick={(e) => handleDelete(item.id, e)} className="p-2 text-dm-border hover:text-dm-danger">
                      <Trash2 size={16}/>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Columna Derecha: Tarjeta Inmersiva del Mercader */}
      <div className="w-full lg:w-[400px] shrink-0 order-1 lg:order-2">
        <div className="lg:sticky lg:top-6 flex flex-col bg-dm-bg-darker border border-dm-border shadow-2xl shadow-black overflow-hidden rounded-sm">
          {/* Imagen Full-Bleed con Fade Inferior */}
          <div className="w-full h-56 sm:h-80 lg:h-[500px] relative bg-dm-bg-darker">
             {shop.ownerImage ? (
               <>
                 <img src={shop.ownerImage} alt={shop.name} className="w-full h-full object-cover object-top" />
                 {/* Intense gradient overlay to ensure it completely blends to the panel background color (#151210) before the text */}
                 <div className="absolute inset-0 bg-gradient-to-t from-dm-bg-darker via-dm-bg-darker/70 to-transparent"></div>
                 <div className="absolute bottom-0 w-full h-48 bg-gradient-to-t from-dm-bg-darker via-dm-bg-darker to-transparent"></div>
                 <div className="absolute bottom-0 w-full h-16 bg-dm-bg-darker"></div>
               </>
             ) : (
               <div className="w-full h-full flex items-center justify-center">
                 <KindIcon size={64} className="text-dm-border" />
               </div>
             )}
          </div>

          {/* Info del Mercader sobre la imagen difuminada */}
          <div className="relative z-10 px-5 sm:px-8 pb-5 sm:pb-8 pt-0 -mt-16 sm:-mt-20">
            <h2 className="text-2xl sm:text-3xl font-display text-dm-text-muted tracking-wider mb-2 break-words">{shop.name}</h2>

            <div className="flex items-center gap-3">
              <div className="h-[1px] w-8 bg-dm-accent/50"></div>
              <p className="text-xs uppercase tracking-[0.2em] text-dm-accent font-bold">{shop.ownerName || "Anónimo"}</p>
            </div>

            {/* Decoración adicional opcional */}
            <div className="mt-8 pt-6 border-t border-dm-border/50 flex justify-between items-center">
               <span className="text-[10px] uppercase tracking-widest text-dm-muted-alt">{kindLabel || "Propietario / Mercader"}</span>
               <KindIcon size={16} className="text-dm-border" />
            </div>
          </div>
        </div>
      </div>

      {!readOnly && (
        <AddItemModal
          isOpen={isAddItemOpen}
          onClose={() => setIsAddItemOpen(false)}
          shopId={shop.id}
          editData={editItemData}
        />
      )}

      <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title={viewItem?.name || ""}>
        {viewItem && (
          <div className="flex flex-col gap-6">
            {viewItem.image && (
              <img src={viewItem.image} alt={viewItem.name} className="w-full h-48 object-cover border border-dm-border rounded-sm" />
            )}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-dm-muted uppercase tracking-widest">Precio</span>
                <span className="font-mono text-dm-accent">{viewItem.price}</span>
              </div>
              <div className="w-full h-px bg-dm-border" />
              <div className="text-sm leading-relaxed text-dm-text prose prose-invert prose-sm max-w-none prose-strong:text-dm-text-bright">
                <Markdown units>{viewItem.description}</Markdown>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deleteItemId}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => { if (deleteItemId) actions.deleteShopItem(shop.id, deleteItemId); setDeleteItemId(null); }}
        title="Eliminar Objeto"
        message="¿Estás seguro de que quieres eliminar este objeto permanentemente?"
      />
    </div>
  );
}

function AddShopModal({ isOpen, onClose, editData }: { isOpen: boolean, onClose: () => void, editData: Shop | null }) {
  const [loading, setLoading] = useState(false);
  
  // State for the uploaded image (full)
  const [fullImage, setFullImage] = useState(editData?.ownerImage || "");
  // State for the cropped image (preview)
  const [previewImage, setPreviewImage] = useState(editData?.previewImage || "");
  
  // State for Cropper Modal
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  // This modal stays mounted between uses, so reset the images each time it opens.
  React.useEffect(() => {
    if (isOpen) {
      setFullImage(editData?.ownerImage || "");
      setPreviewImage(editData?.previewImage || "");
      setRawImageSrc(null);
    }
  }, [isOpen, editData]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 800);
        setFullImage(compressed);
        const dataUrl = await readFileAsDataURL(file);
        setRawImageSrc(dataUrl);
      } catch (err) {
        alert("Error al cargar la imagen");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const ownerName = formData.get("ownerName") as string;
    
    setLoading(true);
    try {
      if (editData) {
        actions.updateShop(editData.id, { name, ownerName, ownerImage: fullImage, previewImage: previewImage });
      } else {
        actions.addShop({ name, ownerName, ownerImage: fullImage, previewImage: previewImage });
      }
      onClose();
    } catch (e) {
      alert("Error al procesar la imagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop={false} title={editData ? "Editar Tienda" : "Nueva Tienda"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nombre de la Tienda" name="name" required defaultValue={editData?.name} />
          <Input label="Nombre del Mercader" name="ownerName" required defaultValue={editData?.ownerName} />
          
          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-bold text-dm-accent uppercase tracking-widest">Imagen (Tienda o Mercader)</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="flex h-10 w-full bg-dm-bg border border-dm-border px-3 py-1 text-sm text-dm-text-bright file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-dm-accent cursor-pointer"
            />
          </div>

          {(previewImage || fullImage) && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-bold text-dm-accent uppercase tracking-widest">Vista Previa de Tarjeta</label>
                {fullImage && (
                  <button type="button" onClick={() => setRawImageSrc(fullImage)} className="text-xs text-dm-muted hover:text-dm-accent underline">
                    Ajustar Recorte
                  </button>
                )}
              </div>
              <div className="relative h-32 w-full overflow-hidden bg-dm-bg-darker border border-dm-border rounded-sm mt-1 flex items-center justify-center">
                {previewImage ? (
                  <img 
                    src={previewImage} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <img 
                    src={fullImage} 
                    alt="Full Image" 
                    className="w-full h-full object-cover" 
                  />
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dm-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Procesando..." : "Guardar"}</Button>
          </div>
        </form>
      </Modal>

      {rawImageSrc && (
        <ImageCropperModal
          isOpen={!!rawImageSrc}
          imageSrc={rawImageSrc}
          aspect={16/7}
          title="Recortar Miniatura de Tienda"
          onClose={() => setRawImageSrc(null)}
          onCropComplete={(croppedBase64) => {
            setPreviewImage(croppedBase64);
            setRawImageSrc(null);
          }}
        />
      )}
    </>
  );
}

function AddItemModal({ isOpen, onClose, shopId, editData }: { isOpen: boolean, onClose: () => void, shopId: string, editData: ShopItem | null }) {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState("");

  // This modal stays mounted between uses, so reset the image each time it opens.
  React.useEffect(() => {
    if (isOpen) setImage(editData?.image || "");
  }, [isOpen, editData]);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setImage(await compressImage(file, 600));
    } catch {
      alert("Error al procesar la imagen");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;

    if (editData) {
      actions.updateShopItem(shopId, editData.id, { name, description, price, image });
    } else {
      actions.addShopItem(shopId, { name, description, price, image, hidden: false });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop={false} title={editData ? "Editar Objeto" : "Nuevo Objeto"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Nombre del Objeto" name="name" required defaultValue={editData?.name} />
        <Input label="Precio" name="price" required defaultValue={editData?.price} placeholder="Ej: 50 po" />
        <Textarea label="Descripción" name="description" required defaultValue={editData?.description} />
        <div className="flex flex-col gap-1 w-full">
          <span className="text-[10px] font-bold text-dm-accent uppercase tracking-widest">Imagen (Opcional)</span>
          <div className="flex items-center gap-4">
            {image ? (
              <div className="relative w-16 h-16 border border-dm-accent shrink-0">
                <img src={image} alt="Vista previa" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setImage("")} aria-label="Quitar imagen" title="Quitar imagen" className="absolute -top-2 -right-2 p-1 bg-dm-bg-darker border border-dm-border rounded-full text-dm-danger">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="w-16 h-16 border border-dm-border flex items-center justify-center text-dm-muted cursor-pointer hover:border-dm-accent hover:text-dm-accent transition-colors shrink-0">
                <ImageIcon size={20} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
            )}
            <span className="text-xs text-dm-muted italic">Se guarda dentro de la app; usa imágenes ligeras.</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dm-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? "Procesando..." : "Guardar"}</Button>
        </div>
      </form>
    </Modal>
  );
}
