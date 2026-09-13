import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { store, useStore, actions } from "../store/useStore";
import { Modal } from "../components/ui/Modal";
import { Button, Input, Textarea } from "../components/ui/Input";
import { Shop, ShopItem } from "../types";
import { Plus, Trash2, Edit2, Store as StoreIcon, EyeOff, Eye, Image as ImageIcon, Upload, Download } from "lucide-react";
import { compressImage, cn } from "../lib/utils";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { SortableGrid } from "../components/SortableGrid";
import { ImportModal } from "../components/ImportModal";
import { ImageCropperModal } from "../components/ImageCropperModal";
import { readFileAsDataURL } from "../lib/utils";

export function ViewShops() {
  const { shops } = useStore();
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editShopData, setEditShopData] = useState<Shop | null>(null);
  const [deleteShopId, setDeleteShopId] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<any>(null);

  const selectedShop = shops.find((s) => s.id === selectedShopId);

  const handleEditShop = (s: Shop, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditShopData(s);
    setIsAddOpen(true);
  };

  const handleDeleteShop = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteShopId(id);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportShops = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(shops));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "ndms_tiendas.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          setPendingImport(parsed);
        } else if (parsed && parsed.shops && Array.isArray(parsed.shops)) {
          setPendingImport(parsed.shops);
        } else {
          alert("El archivo no parece contener tiendas válidas.");
        }
      } catch (err) {
        alert("Archivo de tiendas inválido.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmImport = (mode: "merge" | "overwrite") => {
    if (!pendingImport) return;
    if (mode === "overwrite") {
      store.setState({ shops: pendingImport });
    } else {
      store.setState({ shops: [...(store.getState().shops || []), ...pendingImport] });
    }
    setPendingImport(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-transparent border-none rounded-none overflow-hidden relative">
      <div className="bg-dm-bg px-4 sm:px-6 py-4 border-b border-dm-border flex justify-between items-center z-10 relative gap-4">
        <h2 className="text-lg uppercase tracking-widest text-dm-accent font-light flex items-center gap-2 truncate">
          <StoreIcon className="text-dm-accent shrink-0" size={20} /> <span className="hidden sm:inline">Tiendas</span><span className="sm:hidden">Tiendas</span>
        </h2>
        {!selectedShop && (
          <div className="flex gap-2">
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
            <Button variant="ghost" onClick={() => fileInputRef.current?.click()} className="hidden sm:flex border border-dm-border" title="Importar Tiendas">
              <Download size={14} className="mr-1" /> Importar
            </Button>
            <Button variant="ghost" onClick={exportShops} className="hidden sm:flex border border-dm-border" title="Exportar Tiendas">
              <Upload size={14} className="mr-1" /> Exportar
            </Button>
            <Button onClick={() => { setEditShopData(null); setIsAddOpen(true); }} className="whitespace-nowrap shrink-0 bg-dm-bg-hover border border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-accent">
              <Plus size={14} className="mr-1" /> Nueva Tienda
            </Button>
          </div>
        )}
        {selectedShop && (
          <Button variant="secondary" onClick={() => setSelectedShopId(null)} className="whitespace-nowrap shrink-0">
            Volver a Tiendas
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar z-10 relative">
        {!selectedShop ? (
          <>
          <SortableGrid
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
          items={shops || []}
          onReorder={(newShops) => actions.reorderShops(newShops)}
          renderItem={(s) => (
            <div 
              className="bg-dm-bg-darker group active:scale-[0.98] border border-dm-border overflow-hidden cursor-pointer hover:border-dm-accent hover:shadow-[0_0_15px_rgba(193,160,99,0.15)] transition-all duration-300 flex flex-col shadow-lg shadow-black/80 relative"
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
                    <StoreIcon size={48} className="text-dm-border mb-2 group-hover:text-dm-border-focus transition-colors duration-500" />
                    <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-dm-bg-darker to-transparent"></div>
                  </div>
                )}
                
                {/* Botones de Acción Superpuestos */}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-[-10px] group-hover:translate-y-0">
                  <button 
                    onClick={(e) => handleEditShop(s, e)} 
                    className="p-2 bg-dm-bg-darker/90 backdrop-blur-sm border border-dm-border text-dm-muted hover:text-dm-accent hover:border-dm-accent transition-all duration-200"
                    title="Editar Tienda"
                  >
                    <Edit2 size={16}/>
                  </button>
                  <button 
                    onClick={(e) => handleDeleteShop(s.id, e)} 
                    className="p-2 bg-dm-bg-darker/90 backdrop-blur-sm border border-dm-border text-dm-muted hover:text-dm-danger hover:border-dm-danger transition-all duration-200"
                    title="Eliminar Tienda"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
              
              {/* Contenido de la Tarjeta */}
              <div className="p-6 flex-1 flex flex-col relative">
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
                      <span className="text-xs font-mono text-dm-accent">{s.items?.length || 0}</span>
                    </div>
                 </div>
              </div>
              
              {/* Brillo en hover */}
              <div className="absolute inset-0 border border-dm-accent opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          )}
        />
            {shops.length === 0 && (
              <p className="text-dm-text opacity-50 text-center py-10 col-span-full ">No hay tiendas. Crea una para añadir objetos.</p>
            )}
          </>
        ) : (
          <ShopInventory shop={selectedShop} />
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
      <ImportModal
        isOpen={!!pendingImport}
        onClose={() => setPendingImport(null)}
        onMerge={() => confirmImport("merge")}
        onOverwrite={() => confirmImport("overwrite")}
      />
    </div>
  );
}

function ShopInventory({ shop }: { shop: Shop }) {
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editItemData, setEditItemData] = useState<ShopItem | null>(null);
  const [viewItem, setViewItem] = useState<ShopItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const handleEdit = (item: ShopItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditItemData(item);
    setIsAddItemOpen(true);
  };

  const handleToggleHide = (item: ShopItem, e: React.MouseEvent) => {
    e.stopPropagation();
    actions.updateShopItem(shop.id, item.id, { hidden: !item.hidden });
  };

  const handleDelete = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteItemId(itemId);
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 relative z-10 w-full pb-20">
      
      {/* Columna Izquierda: Lista de Objetos (Inventario) */}
      <div className="flex-1 flex flex-col gap-6 order-2 lg:order-1">
        <div className="flex justify-between items-center bg-dm-bg/90 p-6 border border-dm-border shadow-lg shadow-black/50 rounded-sm">
          <div>
            <h2 className="text-2xl font-display text-dm-accent uppercase tracking-widest">Inventario</h2>
            <p className="text-xs uppercase tracking-widest text-dm-text opacity-70 mt-1">{shop.items.length} Objetos Disponibles</p>
          </div>
          <Button onClick={() => { setEditItemData(null); setIsAddItemOpen(true); }}>
            <Plus size={14} className="mr-1" /> Añadir Objeto
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {shop.items.length === 0 && (
            <div className="p-10 text-center border border-dashed border-dm-border bg-dm-bg/50 text-dm-muted text-sm tracking-widest uppercase">
              El inventario está vacío
            </div>
          )}
          {shop.items.map((item) => (
            <div 
              key={item.id} 
              className={cn(
                "flex items-center justify-between p-4 border transition-all shadow-md shadow-black/30",
                item.hidden 
                  ? "bg-[#000000] border-dm-bg-darker" 
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
                    <h3 className="font-bold text-dm-muted line-through">{item.name}</h3>
                    <p className="text-xs text-dm-muted-alt">Oculto para jugadores</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-12 h-12 object-cover border border-dm-border rounded-sm" />
                  ) : (
                    <div className="w-12 h-12 bg-dm-bg-darker border border-dm-border flex items-center justify-center rounded-sm">
                      <ImageIcon className="text-dm-accent opacity-30" size={20} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-dm-accent text-lg font-display">{item.name}</h3>
                    <p className="text-xs text-dm-muted font-mono">{item.price}</p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <button onClick={(e) => handleToggleHide(item, e)} className={cn("p-2", item.hidden ? "text-dm-accent" : "text-dm-border hover:text-dm-accent")}>
                  {item.hidden ? <Eye size={16}/> : <EyeOff size={16}/>}
                </button>
                <button onClick={(e) => handleEdit(item, e)} className="p-2 text-dm-border hover:text-dm-accent">
                  <Edit2 size={16}/>
                </button>
                <button onClick={(e) => handleDelete(item.id, e)} className="p-2 text-dm-border hover:text-dm-danger">
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Columna Derecha: Tarjeta Inmersiva del Mercader */}
      <div className="w-full lg:w-[400px] shrink-0 order-1 lg:order-2">
        <div className="sticky top-6 flex flex-col bg-dm-bg-darker border border-dm-border shadow-2xl shadow-black overflow-hidden rounded-sm">
          {/* Imagen Full-Bleed con Fade Inferior */}
          <div className="w-full h-[500px] relative bg-dm-bg-darker">
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
                 <StoreIcon size={64} className="text-dm-border" />
               </div>
             )}
          </div>
          
          {/* Info del Mercader sobre la imagen difuminada */}
          <div className="relative z-10 px-8 pb-8 pt-0 -mt-20">
            <h2 className="text-3xl font-display text-dm-text-muted tracking-wider mb-2">{shop.name}</h2>
            
            <div className="flex items-center gap-3">
              <div className="h-[1px] w-8 bg-dm-accent/50"></div>
              <p className="text-xs uppercase tracking-[0.2em] text-dm-accent font-bold">{shop.ownerName || "Anónimo"}</p>
            </div>
            
            {/* Decoración adicional opcional */}
            <div className="mt-8 pt-6 border-t border-dm-border/50 flex justify-between items-center">
               <span className="text-[10px] uppercase tracking-widest text-dm-muted-alt">Propietario / Mercader</span>
               <StoreIcon size={16} className="text-dm-border" />
            </div>
          </div>
        </div>
      </div>

      <AddItemModal 
        isOpen={isAddItemOpen} 
        onClose={() => setIsAddItemOpen(false)} 
        shopId={shop.id} 
        editData={editItemData} 
      />
      
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
              <div className="text-dm-text opacity-90 whitespace-pre-wrap leading-relaxed ">
                {viewItem.description}
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
      <Modal isOpen={isOpen} onClose={onClose} title={editData ? "Editar Tienda" : "Nueva Tienda"}>
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
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    
    setLoading(true);
    try {
      let image = editData?.image || "";
      const file = fileRef.current?.files?.[0];
      if (file) {
        image = await compressImage(file, 600);
      }

      if (editData) {
        actions.updateShopItem(shopId, editData.id, { name, description, price, image });
      } else {
        actions.addShopItem(shopId, { name, description, price, image, hidden: false });
      }
      onClose();
    } catch (e) {
      alert("Error al procesar la imagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? "Editar Objeto" : "Nuevo Objeto"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Nombre del Objeto" name="name" required defaultValue={editData?.name} />
        <Input label="Precio" name="price" required defaultValue={editData?.price} placeholder="Ej: 50 gp" />
        <Textarea label="Descripción" name="description" required defaultValue={editData?.description} />
        <div className="flex flex-col gap-1 w-full">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Imagen (Opcional)</label>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileRef}
            className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-orange-500"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-zinc-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? "Procesando..." : "Guardar"}</Button>
        </div>
      </form>
    </Modal>
  );
}
