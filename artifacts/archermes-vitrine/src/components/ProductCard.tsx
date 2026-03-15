import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useState } from "react";
import { NeonButton } from "./NeonButton";

export interface NFTProduct {
  id: number;
  name: string;
  collection: string;
  price: string;
  image: string;
}

interface ProductCardProps {
  product: NFTProduct;
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="glass-panel rounded-2xl overflow-hidden group relative flex flex-col"
    >
      {/* Glow effect behind card on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-muted/30 p-4">
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={() => setIsLiked(!isLiked)}
            className="w-8 h-8 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <Heart className={`w-4 h-4 transition-colors ${isLiked ? 'fill-secondary text-secondary' : 'text-white'}`} />
          </button>
        </div>
        
        <motion.img
          animate={{ scale: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          src={`${import.meta.env.BASE_URL}images/${product.image}`}
          alt={product.name}
          className="w-full h-full object-cover rounded-xl shadow-2xl relative z-0"
        />
        
        {/* Top left badge */}
        <div className="absolute top-4 left-4 z-10 glass-panel px-2 py-1 rounded-md">
          <span className="text-[10px] font-display uppercase tracking-wider text-primary">Unique</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow relative z-10">
        <div className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-1">
          {product.collection}
        </div>
        <h3 className="font-display font-bold text-lg mb-4 text-foreground group-hover:text-glow transition-all">
          {product.name}
        </h3>
        
        <div className="mt-auto pt-4 border-t border-white/10 flex items-end justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Current Price</div>
            <div className="flex items-center gap-1.5">
              {/* Ethereum symbol approximation */}
              <svg viewBox="0 0 320 512" className="w-3 h-4 fill-secondary">
                <path d="M311.9 260.8L160 353.6 8 260.8 160 0l151.9 260.8zM160 383.4L8 290.6 160 512l152-221.4-152 92.8z" />
              </svg>
              <span className="font-mono font-bold text-xl text-white">{product.price}</span>
            </div>
          </div>
          
          <NeonButton 
            variant="outline" 
            size="sm" 
            className={`transition-all duration-300 ${isHovered ? 'bg-primary/20 border-primary shadow-[0_0_10px_hsl(var(--primary)/0.3)]' : ''}`}
            onClick={() => console.log(`Buying ${product.name}`)}
          >
            Buy Now
          </NeonButton>
        </div>
      </div>
    </motion.div>
  );
}
