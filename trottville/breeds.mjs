// The Trottville breed guide: horse breeds from around the world, each with one kid-sized fact (written from the
// breed's Wikipedia introduction, fetched 2026-11-08; `wiki` is the article to read more). Pure data, no DOM.
// ranch.mjs turns these into market breeds; ranch-ui.js draws the searchable guide.
//
// usd = a rough typical price for a trained adult horse of that breed (real prices vary a lot). In-game price
// follows it on a gentle curve anchored to the economy plan: a $5,000 breed = 1,500 🪙, a $25,000 Clydesdale =
// 10,000 🪙 (see breedCoins). wild = lives free and protected: in the guide, never in the market.
// coats/marks use the keys in ranch.mjs (COATS; marks: blaze socks dapple spots patches feathers).
// group: pony · draft · riding · gaited · sport (warmbloods) · wild (wild and feral herds) · longears (donkeys, mules).

export const GROUPS={pony:'Ponies',draft:'Draft horses',riding:'Riding horses',gaited:'Gaited horses',sport:'Sport horses',wild:'Wild & feral',longears:'Donkeys & mules'};

// [id, name, origin, group, usd, size, coats, marks, trait, fact, wiki, extra]
const B=[
  ['quarter','Quarter Horse','USA','riding',5000,1,'sorrel bay chestnut black buckskin palomino dun grulla roan grey','blaze socks','Calm and steady','It’s named for winning races of a quarter mile, and some have been timed at about 44 mph (71 km/h) over that short sprint.','American_Quarter_Horse',{tier:'starter',freeCoat:'bay'}],
  ['arabian','Arabian','Arabian Peninsula','riding',8000,.94,'bay grey chestnut black roan','blaze socks dapple','Bright and quick','You can spot one by its dished face and high-held tail. It’s one of the oldest horse breeds in the world.','Arabian_horse',{tier:'starter',freeCoat:'bay'}],
  ['welsh','Welsh Pony','Wales','pony',4000,.8,'grey chestnut bay black palomino dun buckskin roan','blaze socks','Small and brave','The Welsh family has four sections, from the little Welsh Mountain Pony (Section A) up to the strong Welsh Cob (Section D).','Welsh_Pony_and_Cob',{tier:'starter',freeCoat:'chestnut'}],
  ['appaloosa','Appaloosa','USA','riding',5000,1,'bay chestnut black grey','spots','Spotted and spirited','Its spots are patterns laid over a base colour, so every Appaloosa’s coat is a one-of-a-kind mix.','Appaloosa'],
  ['paint','Paint Horse','USA','riding',6000,1,'bay chestnut black palomino','patches','Bold patches, big heart','Every Paint has Quarter Horse or Thoroughbred family behind its patches, and its registry is one of the biggest in North America.','American_Paint_Horse'],
  ['morgan','Morgan','USA','riding',6000,.95,'bay black chestnut','blaze socks','Friendly all-rounder','Every Morgan traces back to one small stallion named Figure, later called Justin Morgan after his owner.','Morgan_horse'],
  ['thoroughbred','Thoroughbred','England','riding',6000,1.04,'bay chestnut black grey','blaze socks','Born to run','Bred in England in the 1600s and 1700s just for racing, it’s called “hot-blooded” for its speed and spirit.','Thoroughbred'],
  ['andalusian','Andalusian','Spain','riding',18000,1.02,'grey white bay','dapple','Proud and graceful','Also called the Pure Spanish Horse, it has looked almost the same since the 1400s.','Andalusian_horse'],
  ['friesian','Friesian','Netherlands','draft',20000,1.06,'black','feathers','Gentle giant in black','Famous for its all-black coat, long wavy mane and hairy “feathers” on its legs. The breed nearly died out more than once.','Friesian_horse'],
  ['mustang','Mustang','USA','wild',2000,.97,'dun buckskin bay grulla','patches socks','Wild and clever','Mustangs are called wild, but they’re really feral: their ancestors were Spanish horses that escaped or were set free.','Mustang'],
  ['clydesdale','Clydesdale','Scotland','draft',25000,1.18,'bay black roan','blaze feathers patches','Huge, soft and strong','Named after the valley of the River Clyde in Scotland. After 1877 thousands sailed to Australia and New Zealand to help build farms.','Clydesdale_horse'],
  ['akhal','Akhal-Teke','Turkmenistan','riding',30000,1,'golden silver','socks','A coat that shimmers','Nicknamed the “Golden Horses” for the metal-like shine of their coats. Only about 6,600 live in the whole world.','Akhal-Teke'],
  ['vanner','Gypsy Vanner','Ireland & Britain','draft',25000,1.05,'black bay','patches feathers','Flowing mane and feathers','Bred by Irish and English Traveller families to pull their wagons. It had no official stud-book until 1996.','Gypsy_horse'],
  // Draft horses
  ['shire','Shire','England','draft',15000,1.2,'black bay grey','blaze feathers','The gentle tower','Shires once towed canal boats across England, and a Shire born in 1846 is the tallest horse ever recorded.','Shire_horse'],
  ['percheron','Percheron','France','draft',12000,1.16,'grey black','','Clever and willing','From the old Perche region of France. Most are grey or black, and they’re known for being smart, willing workers.','Percheron'],
  ['belgian','Belgian Draft','Belgium','draft',10000,1.18,'sorrel roan','blaze','Strong and sweet','Usually a light chestnut with a pale mane. One Belgian, Brooklyn Supreme, weighed about 1,450 kg (3,200 lb)!','American_Belgian_Draft'],
  ['suffolk','Suffolk Punch','England','draft',10000,1.1,'chestnut','','Round and rosy','Always chestnut. “Punch” is an old English word for someone short and stout.','Suffolk_Punch'],
  ['creamdraft','American Cream Draft','USA','draft',8000,1.14,'cream','blaze','Golden and gentle','It started in Iowa with one cream-coloured mare called Old Granny, and it’s still rare today.','American_Cream_Draft'],
  ['ardennes','Ardennes','Belgium & France','draft',8000,1.12,'bay roan chestnut','','Old and sturdy','One of the oldest draft breeds, with a story that goes back to Ancient Rome.','Ardennais'],
  ['boulonnais','Boulonnais','France','draft',9000,1.14,'grey','dapple','Elegant heavyweight','Nicknamed the “White Marble Horse” for its gleaming grey coat.','Boulonnais_horse'],
  ['breton','Breton','France','draft',7000,1.1,'chestnut roan','','Two horses in one','Comes in two types: the nimble Postier Breton for pulling carts and the heavier Trait Breton for farm work.','Breton_horse'],
  ['comtois','Comtois','France & Switzerland','draft',6000,1.06,'sorrel bay','','Mountain worker','From the Jura Mountains on the border of France and Switzerland, and usually chestnut with a pale mane.','Comtois_horse'],
  ['jutland','Jutland','Denmark','draft',7000,1.12,'sorrel','blaze','Calm and willing','Named after Denmark’s Jutland peninsula. It’s compact, muscly and usually chestnut.','Jutland_horse'],
  ['noriker','Noriker','Austria','draft',7000,1.08,'bay black chestnut roan','spots','Alpine strongman','Named after the old Roman province of Noricum, and some Norikers have leopard spots!','Noriker_horse'],
  ['blackforest','Black Forest Horse','Germany','draft',8000,1.04,'chestnut','','Dark with a golden mane','A rare light draft horse from Germany’s Black Forest, usually dark chestnut with a pale mane.','Black_Forest_Horse'],
  ['irishdraught','Irish Draught','Ireland','draft',10000,1.08,'bay grey chestnut','','Kind and capable','Ireland’s national horse. Crossed with Thoroughbreds, it makes the Irish Sport Horse, a top jumper.','Irish_Draught'],
  ['finnhorse','Finnhorse','Finland','draft',6000,1,'sorrel chestnut','blaze','Does it all','The only breed developed fully in Finland. People there call it a horse that can do every job.','Finnhorse'],
  // Ponies
  ['shetland','Shetland Pony','Scotland','pony',1500,.62,'black bay chestnut grey palomino roan','blaze socks patches','Tiny but mighty','Shetlands have lived on their islands since the Bronze Age, and some once worked in coal mines.','Shetland_pony'],
  ['connemara','Connemara Pony','Ireland','pony',8000,.86,'grey dun bay black','','Athletic and kind','From the rocky west coast of Ireland, it’s known for being athletic, versatile and good-natured.','Connemara_pony'],
  ['dartmoor','Dartmoor Pony','England','pony',3000,.74,'bay black grey','','Moorland hardy','It lives half-wild on Dartmoor in Devon, where tin miners once used it to carry loads.','Dartmoor_pony'],
  ['exmoor','Exmoor Pony','England','pony',2500,.74,'bay dun','','Mealy-nosed and tough','Exmoors have a pale “mealy” nose and pale rings round their eyes, called toad eyes.','Exmoor_pony'],
  ['newforest','New Forest Pony','England','pony',4000,.82,'bay chestnut grey black','blaze','Village wanderer','They wander freely through England’s New Forest, so drivers there slow down for ponies on the road.','New_Forest_pony'],
  ['highland','Highland Pony','Scotland','pony',5000,.88,'dun grey bay black','','Sturdy Scot','One of the biggest British native ponies. Many have a dark stripe down the back, and they rarely need horseshoes.','Highland_pony'],
  ['fell','Fell Pony','England','pony',5000,.8,'black bay grey','feathers','Nimble and silky','Usually black with silky leg feathers. It’s a slightly smaller cousin of its neighbour, the Dales Pony.','Fell_pony'],
  ['dales','Dales Pony','England','pony',5000,.86,'black bay','feathers','Strong carrier','It carried lead from mines in the Yorkshire Dales, and nearly died out during World War II.','Dales_Pony'],
  ['eriskay','Eriskay Pony','Scotland','pony',4000,.76,'grey','','Island weatherproof','Its thick, waterproof coat keeps out the wild weather of the Hebrides. Foals are born dark and turn grey.','Eriskay_Pony'],
  ['kerrybog','Kerry Bog Pony','Ireland','pony',3000,.7,'bay black chestnut','','Light-footed','Light enough to cross soft peat bogs, where it once carried peat and seaweed to the villages.','Kerry_Bog_Pony'],
  ['chincoteague','Chincoteague Pony','USA','wild',3000,.78,'chestnut bay palomino black','patches blaze','Book-famous swimmer','Made famous by the book Misty of Chincoteague. Every summer the herd swims across a channel to Chincoteague.','Chincoteague_pony'],
  ['poa','Pony of the Americas','USA','pony',3500,.82,'bay chestnut black grey','spots','Spotted kid’s pony','Started in Iowa in 1954, it’s one of the biggest breed clubs run mostly for young riders.','Pony_of_the_Americas'],
  ['falabella','Falabella','Argentina','pony',5000,.5,'bay black chestnut palomino','patches spots','Pocket-sized','One of the smallest breeds of all: some stand only 63 cm (25 in) tall at the shoulder.','Falabella'],
  ['mini','Miniature Horse','USA','pony',1500,.52,'bay black chestnut palomino grey','patches spots blaze','Little helper','Usually no taller than about 97 cm (38 in). It’s bred to look like a full-sized horse, just tiny.','American_Miniature_Horse'],
  ['caspian','Caspian','Iran','pony',6000,.72,'bay grey chestnut','','Tiny ancient horse','Rediscovered in Iran’s mountains in 1965. It’s pony-sized, but built like a little horse.','Caspian_horse'],
  ['haflinger','Haflinger','Austria & Italy','pony',7000,.88,'sorrel','blaze','Golden and cheerful','Always chestnut with a flaxen (blond) mane and tail. It’s named after the village of Hafling in the Alps.','Haflinger'],
  ['fjord','Norwegian Fjord','Norway','pony',9000,.86,'dun','','Mohawk mane','Always dun. Owners trim its two-colour mane short, so the dark middle stripe stands up like a mohawk.','Fjord_horse'],
  ['gotland','Gotland Pony','Sweden','pony',3000,.76,'dun bay black','','Island original','An old Swedish breed that lived only on the island of Gotland until the 1900s.','Gotland_Russ'],
  ['konik','Konik','Poland','pony',3000,.82,'grulla dun','','Wetland grazer','Usually mouse-grey dun. Herds are used to graze wild wetlands, which helps nature reserves.','Konik'],
  ['hucul','Hucul','Carpathian Mountains','pony',4000,.8,'bay dun grulla black','','Mountain marcher','A sturdy pony from the Carpathian Mountains, named after the Hutsul people who live there.','Hucul_pony'],
  ['pottok','Pottok','Basque Country','pony',2500,.72,'bay black chestnut','patches','Half-wild mountaineer','A semi-wild pony from the Basque mountains between France and Spain.','Pottok'],
  ['landais','Landais','France','pony',3000,.8,'bay black chestnut','','Little Arab look','An endangered French pony with Arab and Welsh blood, so it looks a bit like a small Arabian.','Landais_pony'],
  ['australianpony','Australian Pony','Australia','pony',3000,.8,'grey bay chestnut','blaze','Neat and friendly','Developed in Australia mostly from Welsh ponies, with a dash of Arabian.','Australian_Pony'],
  ['newfoundland','Newfoundland Pony','Canada','pony',3000,.78,'bay black grey roan','','Settler’s helper','Settlers used these ponies to haul wood and fishing gear. They’re a mix of English, Irish and Scottish ponies.','Newfoundland_pony'],
  ['manipuri','Manipuri Pony','India','pony',2000,.74,'bay grey chestnut','','Polo pioneer','British tea planters first saw polo being played in north-east India on these ponies.','Manipuri_pony'],
  ['dosanko','Dosanko','Japan','pony',3000,.82,'bay chestnut roan','','Snow-country pony','The only one of Japan’s eight native breeds that isn’t critically endangered. People from Hokkaido are nicknamed “Dosanko” too.','Dosanko'],
  ['kiso','Kiso','Japan','pony',6000,.82,'bay dun','','Rare and sturdy','The only native horse breed from Honshu, Japan’s main island, and very rare today.','Kiso_Horse'],
  ['jeju','Jeju Horse','South Korea','pony',3000,.78,'chestnut bay grey black','','Winter-tough','Tough enough to live outdoors all winter on Jeju Island, with no blankets or stables.','Jeju_horse'],
  ['sumbawa','Sumbawa Pony','Indonesia','pony',1500,.74,'bay dun black','','Island speedster','Named after its home island in Indonesia, and a close cousin of the Sumba (Sandalwood) Pony.','Sumbawa_Pony'],
  ['spiti','Spiti Horse','India','pony',1500,.76,'grey bay dun','','Himalayan climber','A tough little mountain horse named after the Spiti River in the Himalayas.','Spiti_Horse'],
  ['bhutia','Bhutia Horse','India, Bhutan & Nepal','pony',1500,.78,'bay grey','','High-country helper','A small mountain horse from Sikkim, Bhutan and Nepal, related to Mongolian and Tibetan horses.','Bhutia_Horse'],
  ['nordland','Nordland Horse','Norway','pony',4000,.78,'chestnut bay grey','','Northern little one','The smallest of Norway’s three national horse breeds, from around the Lyngen fjord.','Nordlandshest/Lyngshest'],
  ['nooitgedachter','Nooitgedachter','South Africa','pony',3000,.86,'grey bay chestnut','','Saved by breeders','Bred from 1952 to save the Basotho Pony of Lesotho.','Nooitgedachter'],
  // Gaited horses
  ['icelandic','Icelandic Horse','Iceland','gaited',9000,.84,'chestnut bay black grey dun palomino','patches blaze','Five gaits','It has two extra gaits, the smooth tölt and the speedy flying pace. Once one leaves Iceland it can never go back.','Icelandic_horse'],
  ['saddlebred','American Saddlebred','USA','gaited',8000,1.02,'chestnut bay black','blaze socks','Show-ring star','Once called the “Kentucky Saddler”, it was a favourite horse of officers in the US Civil War.','American_Saddlebred'],
  ['tennessee','Tennessee Walking Horse','USA','gaited',6000,1,'black bay chestnut palomino roan','blaze socks','Smooth and nodding','Famous for its smooth “running walk”, and many nod their heads in time with their steps.','Tennessee_Walking_Horse'],
  ['foxtrotter','Missouri Fox Trotter','USA','gaited',6000,1,'sorrel chestnut black palomino','blaze socks','Comfy trail buddy','It does the “fox trot”: walking with its front legs and trotting with its back legs, for a super-smooth ride.','Missouri_Fox_Trotter'],
  ['pasofino','Paso Fino','Caribbean','gaited',8000,.9,'bay chestnut black palomino','blaze','Tiny quick steps','Its gait is so smooth that people say a rider could carry a full cup without spilling.','Paso_Fino'],
  ['peruvian','Peruvian Paso','Peru','gaited',10000,.95,'bay chestnut black','','National treasure','Peru protects it by law as part of the country’s cultural heritage.','Peruvian_Paso'],
  ['rockymountain','Rocky Mountain Horse','USA','gaited',6000,.96,'chocolate','','Chocolate and smooth','Despite its name it comes from Kentucky’s Appalachian Mountains, and many have a chocolate coat with a pale mane.','Rocky_Mountain_Horse'],
  ['mangalarga','Mangalarga Marchador','Brazil','gaited',12000,.97,'grey bay chestnut','','Brazil’s favourite','Brazil’s national horse breed, with more than half a million of them!','Mangalarga_Marchador'],
  ['racking','Racking Horse','USA','gaited',4000,1,'black chestnut bay','','Singlefooter','Known for the “singlefoot”, a fast, smooth gait where only one foot touches the ground at a time.','Racking_Horse'],
  ['spottedsaddle','Spotted Saddle Horse','USA','gaited',4000,.96,'bay black chestnut','patches','Colourful glider','A colourful pinto with a smooth, gliding gait, made for trail rides.','Spotted_Saddle_Horse'],
  ['floridacracker','Florida Cracker Horse','USA','gaited',5000,.86,'bay grey dun black','','Cowhorse of Florida','Spanish horses came to Florida in the 1500s. Their descendants, these quick gaited horses, are very rare today.','Florida_Cracker_Horse'],
  // Riding horses
  ['lipizzan','Lipizzan','Austria & Slovenia','riding',20000,1,'grey white','dapple','Dancing white horse','Lipizzans are born dark and slowly turn white-grey as they grow up.','Lipizzan'],
  ['lusitano','Lusitano','Portugal','riding',20000,1,'grey bay chestnut black palomino buckskin','dapple','Brave and agile','Ancient Romans told a legend that these speedy horses were fathered by the west wind!','Lusitano'],
  ['standardbred','Standardbred','USA','riding',3000,1,'bay black chestnut','socks','Harness racer','The star of harness racing, where it pulls a light cart at a fast trot or pace.','Standardbred'],
  ['marwari','Marwari','India','riding',12000,.98,'bay chestnut grey black','patches','Heart-shaped ears','Its ears curve inward until the tips can touch, making a heart shape!','Marwari_horse'],
  ['barb','Barb','North Africa','riding',8000,.96,'grey bay black chestnut','','Desert stayer','A hardy horse of North Africa’s Berber people that helped shape many other breeds.','Barb_horse'],
  ['criollo','Criollo','Argentina & Uruguay','riding',5000,.92,'dun grulla bay roan','','Long-distance legend','In the 1920s two Criollos carried their rider about 16,000 km, from Argentina all the way to the USA.','Criollo_horse'],
  ['mongolian','Mongolian Horse','Mongolia','riding',1500,.82,'bay dun grey chestnut','','Outdoor all year','Mongolia has more horses than people, and they live outside all year, from summer heat to −40 °C winters.','Mongolian_horse'],
  ['camargue','Camargue','France','riding',5000,.86,'grey white','','Marsh white horse','The white horses of the marshes of southern France, living in small half-wild herds.','Camargue_horse'],
  ['knabstrupper','Knabstrupper','Denmark','riding',15000,1,'bay chestnut black','spots','Leopard spots','A Danish horse often covered in leopard spots, and a favourite in circuses.','Knabstrupper'],
  ['frederiksborg','Frederiksborger','Denmark','riding',10000,1,'chestnut','blaze','Royal Danish','Denmark’s oldest breed, from 1562. It was once a status symbol all over Europe.','Frederiksborger'],
  ['murgese','Murgese','Italy','riding',8000,1,'black roan','','Black and bold','From the Murge plateau in southern Italy. Most Murgese horses are black.','Murgese'],
  ['menorquin','Menorquín','Spain','riding',15000,1,'black','','Festival rearer','A black horse from the island of Menorca, famous for rearing up on its back legs at summer festivals.','Menorquín_horse'],
  ['mallorquin','Mallorquín','Spain','riding',10000,1,'black','','Rare islander','A rare black horse from the island of Mallorca.','Mallorquín'],
  ['sorraia','Sorraia','Portugal','riding',8000,.86,'dun grulla','','Striped legs','A rare dun horse with zebra-like stripes on its legs, from the Sorraia river in Portugal.','Sorraia'],
  ['azteca','Azteca','Mexico','riding',8000,1,'bay chestnut black grey palomino','','Mexican blend','Created in Mexico by mixing Andalusians with Quarter Horses.','Azteca_horse'],
  ['galiceno','Galiceño','Mexico','riding',3000,.8,'bay black chestnut dun','','Small but a horse','Small like a pony but officially a horse. Its ancestors came from Spain with the conquistadors.','Galiceno'],
  ['marshtacky','Marsh Tacky','USA','riding',4000,.86,'bay dun grulla roan','','Swamp splasher','A very rare horse that’s great at splashing through the swamps of South Carolina.','Carolina_Marsh_Tacky'],
  ['spanishmustang','Spanish Mustang','USA','riding',3000,.9,'dun bay roan palomino','patches','Living history','Ranchers saved these descendants of Spanish horses when the big wild herds were disappearing.','Spanish_Mustang'],
  ['coloradoranger','Colorado Ranger','USA','riding',4000,1,'bay chestnut black','spots','Spotted ranch hand','Every one traces back to two stallions called Patches #1 and Max #2.','Colorado_Ranger'],
  ['curly','Curly Horse','USA','riding',5000,.96,'chestnut bay black palomino','','Teddy-bear coat','It grows a curly coat, especially in winter, like a teddy bear.','American_Bashkir_Curly'],
  ['morab','Morab','USA','riding',5000,.95,'bay chestnut black grey','blaze','Best of both','Half Morgan and half Arabian, mixing the best of both.','Morab'],
  ['nationalshow','National Show Horse','USA','riding',6000,1,'chestnut bay black grey','blaze socks','Show-off','Started in 1981 as a mix of American Saddlebred and Arabian.','National_Show_Horse'],
  ['canadian','Canadian Horse','Canada','riding',7000,1,'black bay','','Little iron horse','Its ancestors came from France to Canada in the late 1600s. It’s nicknamed the “little iron horse”.','Canadian_horse'],
  ['stockhorse','Australian Stock Horse','Australia','riding',7000,1,'bay chestnut black grey','blaze socks','Outback worker','Bred for the Australian outback, and still used by stockmen to work cattle.','Australian_Stock_Horse'],
  ['waler','Waler','Australia','riding',5000,1,'bay chestnut black grey','','Brave traveller','Named after New South Wales. Thousands carried soldiers in World War I.','Waler'],
  ['don','Don','Russia','riding',6000,1.02,'chestnut bay','','Cossack’s horse','The horse of the Cossacks, from the steppes along Russia’s Don River.','Russian_Don'],
  ['budyonny','Budyonny','Russia','riding',7000,1.02,'chestnut golden','','Gold-tinted athlete','Bred as an army horse after 1917; today it’s an all-round competition horse.','Budyonny_horse'],
  ['orlov','Orlov Trotter','Russia','riding',7000,1.02,'grey black bay','dapple','Famous trotter','Russia’s most famous horse, bred in the 1700s by Count Alexei Orlov for its fast trot.','Orlov_Trotter'],
  ['karabakh','Karabakh','Azerbaijan','riding',10000,.94,'chestnut golden bay','','Mountain racer','A fast, good-natured mountain horse from the Karabakh region of the Caucasus.','Karabakh_horse'],
  ['karachai','Karachai','Russia','riding',5000,.94,'black bay','','Up and down the mountains','Spends summers high in the Caucasus Mountains and winters down in the foothills.','Karachay_horse'],
  ['kabarda','Kabardian','Russia','riding',5000,.96,'bay black','','Sure-footed climber','Known for at least 400 years as a tough horse for steep mountain paths.','Kabarda_horse'],
  ['yakutian','Yakutian Horse','Russia','riding',3000,.84,'grey bay dun','','Snow digger','It can find grass under deep snow and survives some of the coldest winters on Earth, in Siberia.','Yakutian_horse'],
  ['turkoman','Turkoman','Iran','riding',15000,1,'bay grey chestnut golden','','Ancient ancestor','An ancient desert horse that helped create the Thoroughbred and the Akhal-Teke.','Turkoman_horse'],
  ['lokai','Lokai','Tajikistan','riding',3000,.9,'grey bay chestnut','','Curly mountaineer','A small, nimble mountain horse from Tajikistan, and some Lokais have curly coats.','Lokai'],
  ['shagya','Shagya Arabian','Hungary','riding',10000,.98,'grey','dapple','Sturdy Arabian','An Arabian-type horse bred in the old Austro-Hungarian Empire to be a little bigger and stronger.','Shagya_Arabian'],
  ['nonius','Nonius','Hungary','riding',6000,1.04,'black bay','','Army workhorse','Named after its founding stallion, Nonius, and bred as an army workhorse in Hungary.','Nonius_horse'],
  ['clevelandbay','Cleveland Bay','England','riding',12000,1.04,'bay','','Always bay','Always bay, and the oldest established horse breed in England.','Cleveland_Bay'],
  ['kladruber','Kladruber','Czech Republic','riding',15000,1.06,'grey black','','Royal carriage horse','Bred for over 400 years at one Czech stud to pull royal carriages for the Habsburg emperors.','Kladruber'],
  ['hackney','Hackney','England','riding',6000,1,'bay black chestnut','blaze socks','High-stepper','A carriage horse that lifts its knees high and can trot fast for a long time.','Hackney_horse'],
  ['dongola','Dongola','Sudan','riding',3000,.98,'bay chestnut black','blaze','Desert rider','A riding horse from Sudan’s Dongola region, now found across much of West Africa too.','Dongola_horse'],
  ['boerperd','Boerperd','South Africa','riding',4000,.98,'bay chestnut black grey','','Brought back','A modern re-creation of the old Cape Horse, which no longer exists.','Boerperd'],
  ['nokota','Nokota','USA','wild',3000,.96,'roan grey black bay','','Badlands survivor','Lived wild in North Dakota’s badlands and was almost wiped out in the early 1900s.','Nokota_horse'],
  ['kiger','Kiger Mustang','USA','wild',3000,.94,'dun grulla','','Stripy-legged mustang','A mustang from Oregon’s Steens Mountain area, often dun with dark stripes on its legs.','Kiger_mustang'],
  ['brumby','Brumby','Australia','wild',1500,.94,'bay chestnut black grey','blaze','Free-roaming Aussie','Australia’s free-roaming horses: at least 400,000 were counted in 2011.','Brumby'],
  ['kaimanawa','Kaimanawa Horse','New Zealand','wild',1500,.92,'bay chestnut black grey','','Calm and hardy','New Zealand’s wild horses. Their numbers are kept low to protect rare plants where they live.','Kaimanawa_horse'],
  // Sport horses (warmbloods)
  ['dutchwb','Dutch Warmblood','Netherlands','sport',40000,1.08,'bay chestnut black grey','blaze socks','Champion athlete','Bred since the 1960s mainly for dressage and show jumping, and among the most successful competition horses ever.','Dutch_Warmblood'],
  ['hanoverian','Hanoverian','Germany','sport',30000,1.08,'bay chestnut black grey','blaze socks','Proves itself','A horse joins the Hanoverian stud-book by showing how well it performs, not just by who its parents are.','Hanoverian_horse'],
  ['trakehner','Trakehner','Germany','sport',25000,1.06,'bay chestnut black grey','blaze','Brave traveller','It started at a stud in Trakehnen in 1731. In World War II, the horses escaped west on a long, freezing trek.','Trakehner'],
  ['holsteiner','Holsteiner','Germany','sport',30000,1.08,'bay grey black','blaze','Jumping star','Probably the oldest warmblood breed, from the 1200s, and a star of show jumping.','Holsteiner'],
  ['oldenburg','Oldenburg','Germany','sport',25000,1.08,'bay black chestnut grey','blaze socks','Farm horse to athlete','From the old Grand Duchy of Oldenburg in Germany, where it started as a farm and carriage horse.','Oldenburger'],
  ['westphalian','Westphalian','Germany','sport',25000,1.08,'chestnut bay black','blaze socks','Olympic hopeful','Famous for Olympic-level show jumpers and dressage horses.','Westphalian_horse'],
  ['sellefrancais','Selle Français','France','sport',25000,1.08,'chestnut bay','blaze','French jumper','France’s sport horse, created in 1958 when several French riding breeds joined into one.','Selle_Français'],
  ['irishsport','Irish Sport Horse','Ireland','sport',15000,1.08,'bay grey chestnut','','Cross-country hero','A mix of Irish Draught and Thoroughbred that’s brilliant at eventing and jumping.','Irish_Sport_Horse'],
  ['swedishwb','Swedish Warmblood','Sweden','sport',25000,1.06,'bay chestnut black','blaze','From cavalry to dressage','First bred as an army horse at Swedish studs, and now a top dressage horse.','Swedish_Warmblood'],
  ['gelderlander','Gelderlander','Netherlands','sport',8000,1.04,'chestnut','blaze socks','Carriage classic','A Dutch carriage horse that, with the Groninger, founded the Dutch Warmblood in 1965.','Gelderlander'],
  ['groninger','Groninger','Netherlands','sport',9000,1.06,'black bay','','Back from one stallion','By 1978 only one stallion of the old type was left. Breeders rebuilt the breed from him and about 20 mares.','Groninger'],
  ['furioso','Furioso-North Star','Hungary','sport',7000,1.04,'black bay','','Two-stallion legacy','A Hungarian warmblood named after its two founding Thoroughbred stallions, Furioso and North Star.','Furioso-North_Star'],
  ['kisber','Kisber Felver','Hungary','sport',8000,1.04,'bay chestnut','','Rare athlete','A rare sport horse from Hungary; only a handful of people still breed it.','Kisber_Felver'],
  ['wielkopolski','Wielkopolski','Poland','sport',8000,1.04,'chestnut bay black','','Greater Poland','A Polish sport horse whose name means “from Greater Poland”.','Wielkopolski'],
  ['silesian','Silesian Warmblood','Poland','sport',8000,1.08,'black bay','','Heavy and handsome','The heaviest Polish warmblood, often black, and great at pulling carriages.','Silesian_Warmblood'],
  // Lives free and protected: in the guide only
  // Donkeys and mules: rare visitors to the Hoofhaven market (about one every week or so). `ears` makes the
  // sculpt grow long ears; their coats carry it, so every screen draws them right.
  ['donkey','Donkey','Worldwide','longears',1500,.72,'donkeygrey donkeybrown donkeygrey black','','Patient and wise','Donkeys’ huge ears help them hear far-off friends and stay cool in hot deserts, and a donkey’s bray can carry about 3 km (2 miles).','Donkey',{tier:'longears',ears:2.2}],
  ['minidonkey','Miniature Donkey','Sicily & Sardinia','longears',2000,.55,'donkeygrey donkeybrown','','Tiny and cuddly','Miniature donkeys come from the Mediterranean islands of Sicily and Sardinia, and most stand under 91 cm (36 in) at the shoulder.','Miniature_donkey',{tier:'longears',ears:2.1}],
  ['mammoth','Mammoth Jackstock','USA','longears',5000,.96,'black donkeybrown','','The biggest donkey','The largest donkey breed. George Washington helped start it in America with a donkey sent to him by the King of Spain.','American_Mammoth_Jackstock',{tier:'longears',ears:2.3}],
  ['mule','Mule','Worldwide','longears',4000,.98,'bay sorrel black donkeybrown','','Sure-footed and smart','A mule has a donkey dad and a horse mum. Mules are famous for placing their feet carefully on steep mountain trails.','Mule',{tier:'longears',ears:1.65}],
  ['przewalski','Przewalski’s Horse','Mongolia','wild',0,.8,'dun','','Truly wild','A truly wild horse that was once gone from the wild. Since the 1990s it has been brought back to Mongolia’s grasslands.','Przewalski\'s_horse',{wild:true}],
  ['misaki','Misaki Horse','Japan','wild',0,.78,'bay dun','','Cape-top wanderer','Lives free on Cape Toi in southern Japan, where it’s protected as a national treasure.','Misaki_horse',{wild:true}],
  ['riwoche','Riwoche Horse','Tibet','wild',0,.74,'dun','','Mystery horse','Found in a remote Tibetan valley in 1995. People wondered if it was a link to prehistoric horses, but DNA showed it’s a modern horse.','Riwoche_horse',{wild:true}],
  ['banker','Banker Horse','USA','wild',0,.82,'bay chestnut dun','','Shipwreck legend','Lives wild on North Carolina’s Outer Banks islands. Its ancestors may have swum ashore from Spanish shipwrecks.','Banker_horse',{wild:true}],
  ['sableisland','Sable Island Horse','Canada','wild',0,.8,'bay black chestnut','','Sandy-island herd','Lives wild on a remote sandy island off Nova Scotia, and has done since the late 1700s.','Sable_Island_horse',{wild:true}],
];

// Real price → Trotties on a gentle curve: $5,000 → 1,500, $25,000 → 10,000, never below 500 or above 20,000.
export function breedCoins(usd){if(!usd)return 0;return Math.max(500,Math.min(20000,Math.round(1500*Math.pow(usd/5000,1.18)/50)*50));}
// Market rarity follows price: under 3,000 🪙 common, under 9,000 uncommon, 9,000 and up special.
export const tierFor=coins=>coins>=9000?'special':coins>=3000?'uncommon':'common';

// The top of the ladder (Yoshi, 2026-11-08): the priciest real breeds are rare at 25,000, and a few hand-picked breeds
// are legendary, priced for how rare they are rather than their real price. The dream horses take months to save for.
export const RARE_AT=12000,RARE_COINS=25000,LEGENDARY={akhal:100000,marwari:60000,vanner:50000};
export const BREED_LIST=B.map(([id,name,origin,group,usd,size,coats,marks,trait,fact,wiki,extra={}])=>{let coins=breedCoins(usd),tier=extra.tier||(extra.wild?'wild':tierFor(coins));
  if(LEGENDARY[id]){coins=LEGENDARY[id];tier='legendary';}else if(tier==='special'&&coins>=RARE_AT){coins=RARE_COINS;tier='rare';}
  return {id,name,origin,group,usd,size,coats:coats.split(' '),marks:marks?marks.split(' '):[],trait,fact,wiki,coins,...extra,tier};});
export const sizeLabel=s=>s<.66?'Tiny':s<.9?'Pony-sized':s<1.1?'Horse-sized':'Very big';
export const wikiUrl=b=>'https://en.wikipedia.org/wiki/'+encodeURIComponent(b.wiki.replace(/ /g,'_')).replace(/%2F/g,'/');
// Words a kid might type: name, where from, group, colours, trait and the fact.
export const searchText=b=>[b.name,b.origin,GROUPS[b.group],b.coats.join(' '),b.marks.join(' '),b.trait,b.fact,sizeLabel(b.size)].join(' ').toLowerCase();
