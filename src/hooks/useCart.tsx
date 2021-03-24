import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const showError = (message: string) => {
    toast.error(message)
  }

  const persistCart = (newCart: Product[]) => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
  }

  const getProductStock = async (productId: number) => {
    const response = await api.get(`/stock/${productId}`);
    return response.data.amount;
  }

  const addProduct = async (productId: number) => {
    try {
      const currentStock = await getProductStock(productId);
      if (currentStock === 0) {
        throw new Error('Quantidade solicitada fora de estoque');
      }
      
      const productAlreadyInCart = cart.find(p => p.id === productId);
      if (productAlreadyInCart) {
        updateProductAmount({ productId, amount: productAlreadyInCart.amount + 1 });
        return Promise.resolve();
      }

      const { data: product } = await api.get(`/products/${productId}`);
      if (!product) {
        throw new Error( 'Erro na adição do produto');        
      }
      
      const newCart = [...cart, { ...product, amount: 1 }];
      setCart(newCart);
      persistCart(newCart);
    } catch (error) {
      if (error.isAxiosError) {
        showError( 'Erro na adição do produto');        
      }
      showError(error.message);
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const product = cart.find(p => p.id === productId);
      if (!product) {
        throw new Error('Erro na remoção do produto');
      }

      const newCart = cart.filter(product => product.id !== productId);
      setCart(newCart);
      persistCart(newCart);
    } catch (error) {
      showError(error.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount === 0) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      const product = cart.find(p => p.id === productId);
      if (!product) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      const currentStock = await getProductStock(productId);
      if (currentStock - amount < 0) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      const newCart = cart.map(product => product.id === productId ? { ...product, amount } : product);
      setCart(newCart);
      persistCart(newCart);
    } catch (error) {
      showError(error.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
