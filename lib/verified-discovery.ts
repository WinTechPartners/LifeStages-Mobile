// Reviewed source catalog. No generated biographies or invented destination URLs.
export const classicSongs=[
{title:"The Lord’s My Shepherd",artist:'Scottish Psalter',year:'1650',why:'A musical paraphrase of Psalm 23, expressing trust in God’s care.',sourceUrl:'https://www.hymnary.org/text/the_lords_my_shepherd_ill_not_want_rous',tags:['psalm 23','shepherd','care','rest','trust']},
{title:'Amazing Grace',artist:'John Newton',year:'1779',why:'Reflects on grace, change and hope through difficulty.',sourceUrl:'https://hymnary.org/text/amazing_grace_how_sweet_the_sound',tags:['grace','mercy','hope','lost']},
{title:'Be Thou My Vision',artist:'Traditional Irish hymn',year:null,why:'A prayer for God’s presence and guidance.',sourceUrl:'https://hymnary.org/text/be_thou_my_vision_o_lord_of_my_heart',tags:['vision','guide','wisdom','heart']}];
export function rankCatalog<T extends {tags:string[]}>(items:T[],topic:string,context:string){const words=(topic+' '+context).toLowerCase();return items.map((item,index)=>({item,index,score:item.tags.filter(t=>words.includes(t)).length})).sort((a,b)=>b.score-a.score||a.index-b.index).map(({item:{tags,...item}})=>item)}
