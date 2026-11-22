(() => {
  const modes = {
    reaction: {name:'반응 먼저', cue:'반응', shots:['클로즈업','중경','클로즈업'], heights:[.56,1.23,.62], gaps:[175,92], hint:'바라보는 얼굴 → 시선이 향한 대상 → 남은 표정'},
    object: {name:'소품 먼저', cue:'소품', shots:['디테일','전신','중경'], heights:[.43,1.35,.74], gaps:[145,100], hint:'단서가 되는 물건 → 인물과 공간 → 관계가 드러난 다음 컷'},
    voice: {name:'목소리 먼저', cue:'목소리', shots:[null,'전신','클로즈업'], heights:[null,1.28,.58], gaps:[180,100], hint:'여백의 대사 → 말한 사람 또는 시선의 대상 → 한 박자 뒤의 반응'}
  };
  const works = {DN:'이두나!', GM:'녹빛자정의 연인', HN:'하루만 네가 되고 싶어', HC:'함부로 친절하지 말라'};
  const cases = window.RoughRevealCases;

  function variant(cuts, pageEdits, selection, mode) {
    const preset = modes[mode];
    if (!preset || selection.length !== 3 || new Set(selection).size !== 3 ||
        selection.some(slot => !Number.isInteger(slot) || !cuts[slot]?.trim())) return null;

    const positions = [...selection].sort((a,b)=>a-b);
    const order = cuts.map((_,slot)=>slot);
    positions.forEach((slot,i)=>{order[slot]=selection[i]});
    const edits = order.map(slot=>structuredClone(pageEdits[slot] ?? null));
    edits.forEach(edit=>{if(edit)delete edit.reveal});
    positions.forEach((slot,i)=>{
      const edit = edits[slot] ??= {};
      const shot = preset.shots[i], h = preset.heights[i];
      if(h){delete edit.frame;delete edit.quad}
      edit.reveal = {shot,h,voice:mode==='voice'&&i===0};
      if(i<2)edit.gap=preset.gaps[i];
    });

    const reordered = order.map(slot=>cuts[slot]);
    if(mode==='voice'){
      const previous = reordered.findLastIndex((cut,slot)=>slot<positions[0]&&cut.trim());
      if(previous>=0){
        const edit = edits[previous] ??= {};
        edit.gap=Math.max(edit.gap||0,175);
      }
    }
    return {cuts:reordered,edits,order};
  }

  window.RoughReveal = {modes,works,cases,variant};
})();
