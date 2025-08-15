interface AvitoProduct {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  condition: string;
  category: string;
  specifications: string[];
  isAvailable: boolean;
  avitoUrl: string;
  location: string;
  sellerRating: number;
}

interface AvitoApiResponse {
  items?: Array<{
    id?: string;
    title: string;
    price?: {
      value: number;
      original_value?: number;
    };
    images?: Array<{
      url: string;
    }>;
    condition?: string;
    category?: string;
    attributes?: Record<string, string>;
    status?: string;
    url?: string;
    location?: {
      title?: string;
    };
  }>;
}

class AvitoApiService {
  private baseUrl = 'https://api.avito.ru';
  private clientId: string;
  private clientSecret: string;
  private redirectUrl: string;
  private accessToken: string | null = null;

  constructor() {
    this.clientId = import.meta.env.VITE_AVITO_CLIENT_ID || '';
    this.clientSecret = import.meta.env.VITE_AVITO_CLIENT_SECRET || '';
    this.redirectUrl = import.meta.env.VITE_AVITO_REDIRECT_URL || '';
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('Avito API credentials not configured, using mock data');
    }
  }

  // Инициирует OAuth2 авторизацию
  initiateAuth(): void {
    if (!this.clientId) {
      console.error('Client ID not configured');
      return;
    }

    const authUrl = `${this.baseUrl}/oauth/authorize?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(this.redirectUrl)}&` +
      `scope=read_items`;

    window.location.href = authUrl;
  }

  // Обмен кода авторизации на токен доступа
  async exchangeCodeForToken(code: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: this.redirectUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      
      // Сохраняем токен в localStorage
      localStorage.setItem('avito_access_token', this.accessToken);
      
      return true;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      return false;
    }
  }

  // Получает токен из localStorage или инициирует авторизацию
  private async ensureToken(): Promise<string | null> {
    if (this.accessToken) {
      return this.accessToken;
    }

    // Проверяем localStorage
    const storedToken = localStorage.getItem('avito_access_token');
    if (storedToken) {
      this.accessToken = storedToken;
      return this.accessToken;
    }

    // Если нет токена, инициируем авторизацию
    this.initiateAuth();
    return null;
  }

  async getMyProducts(): Promise<AvitoProduct[]> {
    const token = await this.ensureToken();
    
    if (!token) {
      console.warn('No access token available, using mock data');
      return this.getMockProducts();
    }

    try {
      const response = await fetch(`${this.baseUrl}/core/v1/items/my`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Токен истек, очищаем и перезапускаем авторизацию
          localStorage.removeItem('avito_access_token');
          this.accessToken = null;
          this.initiateAuth();
        }
        throw new Error(`Avito API error: ${response.status}`);
      }

      const data: AvitoApiResponse = await response.json();
      return this.transformAvitoData(data);
    } catch (error) {
      console.error('Error fetching from Avito API:', error);
      return this.getMockProducts();
    }
  }

  private transformAvitoData(avitoData: AvitoApiResponse): AvitoProduct[] {
    // Трансформация данных из API Avito в наш формат
    return avitoData.items?.map((item, index) => ({
      id: item.id || `avito-${index}`,
      title: item.title,
      price: item.price?.value || 0,
      originalPrice: item.price?.original_value,
      image: item.images?.[0]?.url || '/placeholder.svg',
      condition: this.mapCondition(item.condition),
      category: this.mapCategory(item.category),
      specifications: this.extractSpecifications(item),
      isAvailable: item.status === 'active',
      avitoUrl: `https://www.avito.ru${item.url || ''}`,
      location: item.location?.title || 'Москва',
      sellerRating: 4.8 // Рейтинг продавца
    })) || [];
  }

  private mapCondition(avitoCondition?: string): string {
    const conditionMap: Record<string, string> = {
      'new': 'Новое',
      'used': 'Б/у',
      'broken': 'Требует ремонта'
    };
    return conditionMap[avitoCondition || ''] || 'Хорошее';
  }

  private mapCategory(avitoCategory?: string): string {
    const categoryMap: Record<string, string> = {
      'noutbuki': 'MacBook',
      'nastolnye_kompyutery': 'iMac',
      'telefony': 'iPhone',
      'planshety': 'iPad'
    };
    return categoryMap[avitoCategory || ''] || 'MacBook';
  }

  private extractSpecifications(item: AvitoApiResponse['items'][0]): string[] {
    const specs: string[] = [];
    
    if (item.attributes) {
      Object.entries(item.attributes).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          specs.push(value);
        }
      });
    }

    return specs.slice(0, 4); // Максимум 4 характеристики
  }

  private getMockProducts(): AvitoProduct[] {
    return [
      {
        id: "1",
        title: "MacBook Pro 14\" M2 Pro 512GB",
        price: 185000,
        originalPrice: 250000,
        image: "/placeholder.svg",
        condition: "Отличное",
        category: "MacBook",
        specifications: ["Apple M2 Pro", "16GB RAM", "512GB SSD", "2023 год"],
        isAvailable: true,
        avitoUrl: "https://www.avito.ru/moskva/noutbuki/macbook_pro_14_m2_pro_512gb",
        location: "Москва",
        sellerRating: 4.9
      },
      {
        id: "2", 
        title: "iMac 24\" M1 256GB",
        price: 120000,
        originalPrice: 180000,
        image: "/placeholder.svg",
        condition: "Хорошее",
        category: "iMac",
        specifications: ["Apple M1", "8GB RAM", "256GB SSD", "2021 год"],
        isAvailable: true,
        avitoUrl: "https://www.avito.ru/moskva/nastolnye_kompyutery/imac_24_m1",
        location: "Москва",
        sellerRating: 4.8
      },
      {
        id: "3",
        title: "iPhone 14 Pro 128GB",
        price: 85000,
        originalPrice: 110000,
        image: "/placeholder.svg",
        condition: "Отличное",
        category: "iPhone",
        specifications: ["A16 Bionic", "128GB", "ProRAW", "2022 год"],
        isAvailable: true,
        avitoUrl: "https://www.avito.ru/moskva/telefony/iphone_14_pro_128gb",
        location: "Москва",
        sellerRating: 5.0
      }
    ];
  }

  // Проверяет, авторизован ли пользователь
  isAuthenticated(): boolean {
    return !!this.accessToken || !!localStorage.getItem('avito_access_token');
  }

  // Выход из системы
  logout(): void {
    this.accessToken = null;
    localStorage.removeItem('avito_access_token');
  }
}

export const avitoApiService = new AvitoApiService();
export type { AvitoProduct }; 
