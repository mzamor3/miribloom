export const quizQuestions = [
  {
    key:'skinTone', question:'What is your skin tone?', layout:'swatch',
    options:[
      ['Fair','quiz-assets/skin-fair.jpg'],['Light','quiz-assets/skin-light.jpg'],
      ['Light Medium','quiz-assets/skin-light-medium.jpg'],['Medium','quiz-assets/skin-medium.jpg'],
      ['Medium Tan','quiz-assets/skin-medium-tan.jpg'],['Tan','quiz-assets/skin-tan.jpg'],
      ['Dark','quiz-assets/skin-dark.jpg'],['Deep','quiz-assets/skin-deep.jpg'],
      ['Very Deep','quiz-assets/skin-very-deep.jpg']
    ]
  },
  {
    key:'undertone', question:'What is your undertone?', layout:'circle',
    options:[['Cool','quiz-assets/undertone-cool.jpg'],['Warm','quiz-assets/undertone-warm.jpg'],['Neutral','quiz-assets/undertone-neutral.jpg'],['Olive','quiz-assets/undertone-olive.jpg'],['Not sure','quiz-assets/undertone-not-sure.jpg']]
  },
  {
    key:'eyeColor', question:'What color are your eyes?', layout:'circle',
    options:[['Brown','quiz-assets/eye-brown.jpg'],['Hazel','quiz-assets/eye-hazel.jpg'],['Blue','quiz-assets/eye-blue.jpg'],['Green','quiz-assets/eye-green.jpg'],['Amber','quiz-assets/eye-amber.jpg'],['Gray','quiz-assets/eye-gray.jpg']]
  },
  {
    key:'hairColor', question:'What color is your hair?', layout:'circle',
    options:[['Black','quiz-assets/hair-black.jpg'],['Dark Brown','quiz-assets/hair-dark-brown.jpg'],['Light Brown','quiz-assets/hair-light-brown.jpg'],['Blonde','quiz-assets/hair-blonde.jpg'],['Red','quiz-assets/hair-red.jpg'],['Gray','quiz-assets/hair-gray.jpg'],['White','quiz-assets/hair-white.jpg']]
  },
  {
    key:'skinType', question:'How would you describe your skin?', layout:'circle',
    options:[['Dry','quiz-assets/skin-type-dry.jpg'],['Oily','quiz-assets/skin-type-oily.jpg'],['Combination','quiz-assets/skin-type-combination.jpg'],['Normal','quiz-assets/skin-type-normal.jpg'],['Sensitive','quiz-assets/skin-type-sensitive.jpg']]
  },
  {
    key:'skinConcern', question:'What is your main skincare concern?', layout:'circle',
    options:[['Hydration','quiz-assets/cat-skincare.jpg'],['Blemishes','quiz-assets/cat-skincare.jpg'],['Dark spots','quiz-assets/cat-skincare.jpg'],['Texture & pores','quiz-assets/cat-skincare.jpg'],['Fine lines','quiz-assets/cat-skincare.jpg'],['Calming','quiz-assets/cat-skincare.jpg']]
  },
  {
    key:'makeupStyle', question:'What is your makeup style?', layout:'circle',
    options:[['Natural','quiz-assets/makeup-natural.jpg'],['Soft glam','quiz-assets/makeup-soft-glam.jpg'],['Full glam','quiz-assets/makeup-full-glam.jpg'],['Trendy & experimental','quiz-assets/makeup-trendy-experimental.jpg'],['Minimal','quiz-assets/makeup-minimal.jpg']]
  },
  {
    key:'favoriteCategory', question:'What do you want more of?', layout:'circle',
    options:[['Skincare','quiz-assets/cat-skincare.jpg'],['Makeup','quiz-assets/cat-makeup.jpg'],['Both equally','quiz-assets/cat-both.jpg'],['Beauty tools','quiz-assets/cat-tools.jpg']]
  },
  {
    key:'lipPreference', question:'Which lip products sound best?', layout:'circle',
    options:[['Nudes & neutrals','quiz-assets/lip-nudes-neutrals.jpg'],['Pinks & berries','quiz-assets/lip-pinks-berries.jpg'],['Reds & bold shades','quiz-assets/lip-reds-bold-shades.jpg'],['Glosses & oils','quiz-assets/lip-glosses-oils.jpg'],['Surprise me','quiz-assets/lip-surprise-me.jpg']]
  },
  {
    key:'hairType', question:'What is your hair type?', layout:'circle',
    options:[['Straight','quiz-assets/hair-type.jpg'],['Wavy','quiz-assets/hair-type.jpg'],['Curly','quiz-assets/hair-type.jpg'],['Coily','quiz-assets/hair-type.jpg'],['Skip hair products','quiz-assets/hair-type.jpg']]
  },
  {
    key:'fragrance', question:'How do you feel about fragrance?', layout:'circle',
    options:[['Love fragrance','quiz-assets/fragrance.jpg'],['Light fragrance only','quiz-assets/fragrance.jpg'],['Fragrance-free preferred','quiz-assets/fragrance.jpg'],['No preference','quiz-assets/fragrance.jpg']]
  }
];

export function renderQuestion(container, question, selectedValue){
  container.innerHTML=`
    <div class="quiz-question visual-question" data-key="${question.key}">
      <h3>${question.question}</h3>
      <div class="visual-options ${question.layout === 'swatch' ? 'swatch-options' : 'circle-options'}">
        ${question.options.map(([value,image])=>`
          <button type="button" class="visual-option ${selectedValue===value?'selected':''}" data-value="${value}">
            <span class="visual-check">✓</span>
            <img src="${image}" alt="${value}">
            <span class="visual-label">${value}</span>
          </button>`).join('')}
      </div>
    </div>`;
}
