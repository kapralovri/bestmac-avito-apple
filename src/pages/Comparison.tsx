import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { CheckCircle, XCircle, Minus } from "lucide-react";

interface MacBookModel {
  id: string;
  name: string;
  year: number;
  chip: string;
  ram: string[];
  storage: string[];
  display: string;
  weight: string;
  battery: string;
  price: string;
  performance: number;
  portability: number;
  value: number;
  ports: string;
  cooling: string;
  camera: string;
  pros: string[];
  cons: string[];
}

const models: MacBookModel[] = [
  {
    id: "air-m1",
    name: "MacBook Air M1",
    year: 2020,
    chip: "Apple M1 (8-core CPU, 7-8 core GPU)",
    ram: ["8GB", "16GB"],
    storage: ["256GB", "512GB", "1TB", "2TB"],
    display: "13.3\" Retina (2560×1600)",
    weight: "1.29 кг",
    battery: "до 18 часов",
    price: "от 35,000₽ б/у",
    performance: 75,
    portability: 95,
    value: 95,
    ports: "2× Thunderbolt 3/USB 4",
    cooling: "Пассивное",
    camera: "720p FaceTime HD",
    pros: [
      "Лучшее соотношение цена/качество",
      "Бесшумная работа",
      "Отличная автономность",
      "Компактный и легкий"
    ],
    cons: [
      "Устаревшая камера 720p",
      "Медленная зарядка MagSafe отсутствует",
      "Только 2 порта USB-C"
    ]
  },
  {
    id: "air-m2",
    name: "MacBook Air M2",
    year: 2022,
    chip: "Apple M2 (8-core CPU, 8-10 core GPU)",
    ram: ["8GB", "16GB", "24GB"],
    storage: ["256GB", "512GB", "1TB", "2TB"],
    display: "13.6\" Liquid Retina (2560×1664)",
    weight: "1.24 кг",
    battery: "до 18 часов",
    price: "от 75,000₽ б/у",
    performance: 85,
    portability: 98,
    value: 90,
    ports: "2× Thunderbolt 3/USB 4, MagSafe 3",
    cooling: "Пассивное",
    camera: "1080p FaceTime HD",
    pros: [
      "Новый дизайн, еще легче",
      "MagSafe 3 освобождает порт",
      "Камера 1080p",
      "Поддержка до 24GB RAM"
    ],
    cons: [
      "Прирост производительности +15% vs M1",
      "256GB модель медленнее (один чип SSD)",
      "Цена выше, чем M1"
    ]
  },
  {
    id: "air-m3",
    name: "MacBook Air M3",
    year: 2024,
    chip: "Apple M3 (8-core CPU, 8-10 core GPU)",
    ram: ["8GB", "16GB", "24GB"],
    storage: ["256GB", "512GB", "1TB", "2TB"],
    display: "13.6\" or 15.3\" Liquid Retina",
    weight: "1.24 кг (13\") / 1.51 кг (15\")",
    battery: "до 18 часов",
    price: "от 95,000₽ б/у (13\"), от 110,000₽ (15\")",
    performance: 92,
    portability: 95,
    value: 85,
    ports: "2× Thunderbolt 3/USB 4, MagSafe 3",
    cooling: "Пассивное",
    camera: "1080p FaceTime HD",
    pros: [
      "Версия 15\" с большим экраном",
      "Прирост производительности +20% vs M2",
      "Аппаратный Ray Tracing",
      "Поддержка 2 внешних мониторов"
    ],
    cons: [
      "Дороже M2 при схожей автономности",
      "Все еще пассивное охлаждение",
      "Не всем нужен прирост vs M2"
    ]
  },
  {
    id: "pro-14-m3",
    name: "MacBook Pro 14\" M3 Pro",
    year: 2023,
    chip: "Apple M3 Pro (11-12 core CPU, 14-18 core GPU)",
    ram: ["18GB", "36GB"],
    storage: ["512GB", "1TB", "2TB", "4TB"],
    display: "14.2\" Liquid Retina XDR (3024×1964) 120Hz",
    weight: "1.55 кг",
    battery: "до 18 часов",
    price: "от 165,000₽ б/у",
    performance: 95,
    portability: 85,
    value: 80,
    ports: "3× Thunderbolt 4, HDMI, SDXC, MagSafe 3",
    cooling: "Активное",
    camera: "1080p FaceTime HD",
    pros: [
      "Профессиональная производительность",
      "XDR дисплей 120Hz",
      "Много портов (HDMI, SD)",
      "Активное охлаждение"
    ],
    cons: [
      "Цена значительно выше Air",
      "Тяжелее и толще",
      "Избыточен для офисных задач"
    ]
  },
  {
    id: "pro-16-m3",
    name: "MacBook Pro 16\" M3 Max",
    year: 2023,
    chip: "Apple M3 Max (14-16 core CPU, 30-40 core GPU)",
    ram: ["36GB", "64GB", "128GB"],
    storage: ["1TB", "2TB", "4TB", "8TB"],
    display: "16.2\" Liquid Retina XDR (3456×2234) 120Hz",
    weight: "2.14 кг",
    battery: "до 22 часов",
    price: "от 250,000₽ б/у",
    performance: 100,
    portability: 70,
    value: 70,
    ports: "3× Thunderbolt 4, HDMI, SDXC, MagSafe 3",
    cooling: "Активное",
    camera: "1080p FaceTime HD",
    pros: [
      "Максимальная производительность",
      "Огромный XDR дисплей",
      "До 128GB RAM",
      "Лучшая автономность (22ч)"
    ],
    cons: [
      "Очень дорогой",
      "Тяжелый (2.14 кг)",
      "Избыточен для 90% задач"
    ]
  }
];

const Comparison = () => {
  const [selectedModels, setSelectedModels] = useState<string[]>(["air-m2", "pro-14-m3"]);

  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Сравнение MacBook", url: "/comparison" }
  ];

  const compareModels = models.filter(m => selectedModels.includes(m.id));

  const renderComparisonValue = (value1: string | number, value2: string | number, isBetter: 'higher' | 'lower' | 'none' = 'none') => {
    if (selectedModels.length !== 2 || isBetter === 'none') return null;
    
    const numValue1 = typeof value1 === 'number' ? value1 : parseFloat(value1);
    const numValue2 = typeof value2 === 'number' ? value2 : parseFloat(value2);
    
    if (isNaN(numValue1) || isNaN(numValue2)) return null;
    
    const isFirst = (isBetter === 'higher' && numValue1 > numValue2) || (isBetter === 'lower' && numValue1 < numValue2);
    const isSecond = (isBetter === 'higher' && numValue2 > numValue1) || (isBetter === 'lower' && numValue2 < numValue1);
    
    return [
      isFirst ? <CheckCircle className="w-4 h-4 text-green-600 inline ml-2" /> : null,
      isSecond ? <CheckCircle className="w-4 h-4 text-green-600 inline ml-2" /> : null
    ];
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Сравнение MacBook — какой выбрать? Air vs Pro, M1 vs M2 vs M3 | BestMac"
        description="Интерактивное сравнение всех моделей MacBook: Air M1/M2/M3, Pro 14/16. Характеристики, производительность, цены. Поможем выбрать идеальный MacBook."
        canonical="/comparison"
        keywords="сравнение macbook, macbook air vs pro, m1 vs m2 vs m3, какой macbook выбрать, сравнить macbook"
      />
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Сравнение MacBook
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Выберите до 3 моделей для детального сравнения характеристик, производительности и цен
        </p>

        {/* Model Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Выберите модели для сравнения (до 3)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {[0, 1, 2].map((index) => (
                <Select
                  key={index}
                  value={selectedModels[index] || ""}
                  onValueChange={(value) => {
                    const newSelected = [...selectedModels];
                    newSelected[index] = value;
                    setSelectedModels(newSelected.filter(Boolean));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Модель ${index + 1}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem 
                        key={model.id} 
                        value={model.id}
                        disabled={selectedModels.includes(model.id) && selectedModels[index] !== model.id}
                      >
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comparison Table */}
        {compareModels.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-card rounded-lg">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-4 text-left sticky left-0 bg-card z-10">Характеристика</th>
                  {compareModels.map((model) => (
                    <th key={model.id} className="p-4 text-center min-w-[250px]">
                      <div className="font-bold text-lg mb-2">{model.name}</div>
                      <Badge variant="secondary">{model.year}</Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border bg-muted/30">
                  <td className="p-4 font-semibold sticky left-0 bg-muted/30">Процессор</td>
                  {compareModels.map((model) => (
                    <td key={model.id} className="p-4 text-center text-sm">{model.chip}</td>
                  ))}
                </tr>
                
                <tr className="border-b border-border">
                  <td className="p-4 font-semibold sticky left-0 bg-card">Оперативная память</td>
                  {compareModels.map((model) => (
                    <td key={model.id} className="p-4 text-center text-sm">{model.ram.join(", ")}</td>
                  ))}
                </tr>
                
                <tr className="border-b border-border bg-muted/30">
                  <td className="p-4 font-semibold sticky left-0 bg-muted/30">Накопитель</td>
                  {compareModels.map((model) => (
                    <td key={model.id} className="p-4 text-center text-sm">{model.storage.join(", ")}</td>
                  ))}
                </tr>
                
                <tr className="border-b border-border">
                  <td className="p-4 font-semibold sticky left-0 bg-card">Дисплей</td>
                  {compareModels.map((model) => (
                    <td key={model.id} className="p-4 text-center text-sm">{model.display}</td>
                  ))}
                </tr>
                
                <tr className="border-b border-border bg-muted/30">
                  <td className="p-4 font-semibold sticky left-0 bg-muted/30">Вес</td>
                  {compareModels.map((model, idx) => (
                    <td key={model.id} className="p-4 text-center text-sm">
                      {model.weight}
                      {renderComparisonValue(
                        parseFloat(model.weight),
                        parseFloat(compareModels[idx === 0 ? 1 : 0]?.weight || '0'),
                        'lower'
                      )?.[idx]}
                    </td>
                  ))}
                </tr>
                
                <tr className="border-b border-border">
                  <td className="p-4 font-semibold sticky left-0 bg-card">Автономность</td>
                  {compareModels.map((model) => (
                    <td key={model.id} className="p-4 text-center text-sm">{model.battery}</td>
                  ))}
                </tr>
                
                <tr className="border-b border-border bg-muted/30">
                  <td className="p-4 font-semibold sticky left-0 bg-muted/30">Порты</td>
                  {compareModels.map((model) => (
                    <td key={model.id} className="p-4 text-center text-sm">{model.ports}</td>
                  ))}
                </tr>
                
                <tr className="border-b border-border">
                  <td className="p-4 font-semibold sticky left-0 bg-card">Охлаждение</td>
                  {compareModels.map((model) => (
                    <td key={model.id} className="p-4 text-center text-sm">{model.cooling}</td>
                  ))}
                </tr>
                
                <tr className="border-b border-border bg-muted/30">
                  <td className="p-4 font-semibold sticky left-0 bg-muted/30">Камера</td>
                  {compareModels.map((model) => (
                    <td key={model.id} className="p-4 text-center text-sm">{model.camera}</td>
                  ))}
                </tr>
                
                <tr className="border-b border-border">
                  <td className="p-4 font-semibold sticky left-0 bg-card">Цена (б/у)</td>
                  {compareModels.map((model) => (
                    <td key={model.id} className="p-4 text-center">
                      <span className="text-lg font-bold text-primary">{model.price}</span>
                    </td>
                  ))}
                </tr>

                {/* Performance Bars */}
                <tr className="border-b border-border bg-muted/30">
                  <td className="p-4 font-semibold sticky left-0 bg-muted/30">Производительность</td>
                  {compareModels.map((model) => (
                    <td key={model.id} className="p-4">
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${model.performance}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-center mt-1">{model.performance}/100</p>
                    </td>
                  ))}
                </tr>
                
                <tr className="border-b border-border">
                  <td className="p-4 font-semibold sticky left-0 bg-card">Портативность</td>
                  {compareModels.map((model) => (
                    <td key={model.id} className="p-4">
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className="bg-green-600 h-2.5 rounded-full" 
                          style={{ width: `${model.portability}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-center mt-1">{model.portability}/100</p>
                    </td>
                  ))}
                </tr>
                
                <tr className="border-b border-border bg-muted/30">
                  <td className="p-4 font-semibold sticky left-0 bg-muted/30">Цена/качество</td>
                  {compareModels.map((model) => (
                    <td key={model.id} className="p-4">
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${model.value}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-center mt-1">{model.value}/100</p>
                    </td>
                  ))}
                </tr>

                {/* Pros/Cons */}
                <tr className="border-b border-border">
                  <td className="p-4 font-semibold sticky left-0 bg-card">Преимущества</td>
                  {compareModels.map((model) => (
                    <td key={model.id} className="p-4">
                      <ul className="text-sm space-y-1">
                        {model.pros.map((pro, idx) => (
                          <li key={idx} className="flex items-start">
                            <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
                
                <tr className="border-b border-border bg-muted/30">
                  <td className="p-4 font-semibold sticky left-0 bg-muted/30">Недостатки</td>
                  {compareModels.map((model) => (
                    <td key={model.id} className="p-4">
                      <ul className="text-sm space-y-1">
                        {model.cons.map((con, idx) => (
                          <li key={idx} className="flex items-start">
                            <XCircle className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gradient-primary rounded-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Нужна помощь с выбором?</h2>
          <p className="mb-6">Наши эксперты помогут подобрать идеальный MacBook под ваши задачи</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button asChild size="lg" variant="secondary">
              <Link to="/selection">Подобрать MacBook</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90">
              <Link to="/buy">Смотреть в наличии</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Comparison;
