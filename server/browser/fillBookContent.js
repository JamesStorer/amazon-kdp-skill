(changes) => {
  const filled = []
  const skipped = []

  const dispatch = (el) => {
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const clickRadio = (name, value) => {
    const el = Array.from(document.querySelectorAll(`input[name="${name}"]`)).find(input => input.value.toLowerCase() === String(value).toLowerCase())
    if (el) {
      el.checked = true
      dispatch(el)
      return true
    }
    return false
  }

  const setHidden = (name, value) => {
    const el = document.querySelector(`input[name="${name}"]`)
    if (el) {
      el.value = String(value)
      dispatch(el)
      return true
    }
    return false
  }

  if (changes.trimWidthIn !== undefined && changes.trimHeightIn !== undefined) {
    const w = Math.round(Number(changes.trimWidthIn) * 100)
    const h = Math.round(Number(changes.trimHeightIn) * 100)
    const label = `${changes.trimWidthIn} x ${changes.trimHeightIn}`
    let ok =
      setHidden('data[print_book][trim_size][width]', w) &&
      setHidden('data[print_book][trim_size][height]', h)
    for (const el of document.querySelectorAll('button, a, label, span')) {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
      if (text.includes(label) || text === `${changes.trimWidthIn}" x ${changes.trimHeightIn}"`) {
        el.click()
        ok = true
        break
      }
    }
    if (ok) filled.push('trimSize')
    else skipped.push('trimSize')
  }

  if (changes.inkAndPaper !== undefined) {
    const aliases = {
      premium_color: ['COLOR_COLOR', 'premium_color'],
      standard_color: ['COLOR_WHITE', 'standard_color'],
      black_and_white: ['BW_WHITE', 'BW_CREAM', 'black_and_white'],
    }
    const candidates =
      aliases[changes.inkAndPaper] || [changes.inkAndPaper]
    let ok = false
    for (const val of candidates) {
      if (clickRadio('data[print_book][ink_and_paper]', val)) {
        ok = true
        break
      }
    }
    if (ok) filled.push('inkAndPaper')
    else skipped.push('inkAndPaper')
  }

  if (changes.interiorHasBleed !== undefined) {
    if (
      clickRadio(
        'data[print_book][interior_has_bleed]',
        changes.interiorHasBleed ? 'true' : 'false',
      )
    ) {
      filled.push('interiorHasBleed')
    } else skipped.push('interiorHasBleed')
  }

  if (changes.coverFinish !== undefined) {
    if (clickRadio('data[print_book][cover_finish]', changes.coverFinish)) {
      filled.push('coverFinish')
    } else skipped.push('coverFinish')
  }

  if (changes.hasPublisherBarcode !== undefined) {
    const val = changes.hasPublisherBarcode ? 'true' : 'false'
    setHidden('data[print_book][has_publisher_barcode]', val)
    const check = document.getElementById('data-print-book-has-publisher-barcode')
    if (check) {
      check.checked = changes.hasPublisherBarcode
      dispatch(check)
    }
    filled.push('hasPublisherBarcode')
  }

  const setSelectById = (id, value) => {
    const el = document.getElementById(id)
    if (!el) return false
    const labels = {
      none: /^none$|^no /i,
      some_minimal: /some.*(minimal|no editing)/i,
      some_extensive: /some.*extensive/i,
      entire_minimal: /entire.*(minimal|no editing)/i,
      entire_extensive: /entire.*extensive/i,
      few_minimal: /(one|few).*minimal/i,
      few_extensive: /(one|few).*extensive/i,
      many_minimal: /many.*minimal/i,
      many_extensive: /many.*extensive/i,
    }
    const option = Array.from(el.options || []).find(option =>
      option.value === value || labels[value]?.test(option.textContent || ''))
    if (!option) return false
    el.value = option.value
    dispatch(el)
    return el.value === option.value
  }
  const record = (key, applied) => (applied ? filled : skipped).push(key)
  if (changes.containsAiContent !== undefined) {
    record('containsAiContent', clickRadio('data[print_book][generative_ai_questionnaire][contains_ai_content]', changes.containsAiContent ? 'YES' : 'NO'))
  }
  for (const [key, id] of [
    ['aiTextAmount', 'generative-ai-questionnaire-text'],
    ['aiImagesAmount', 'generative-ai-questionnaire-images'],
    ['aiTranslationsAmount', 'generative-ai-questionnaire-translations'],
  ]) {
    if (changes[key] !== undefined) record(key, setSelectById(id, changes[key]))
  }
  for (const [key, field] of [['aiTextTool','text'],['aiImagesTool','images']]) {
    if (changes[key]) record(key, setHidden(`data[print_book][generative_ai_questionnaire][${field}][tools][0]`, changes[key]))
  }

  if (changes.assignFreeIsbn) {
    filled.push('assignFreeIsbn')
  }

  return { filled, skipped }
}
