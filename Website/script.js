// Importa o cliente do Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Configuração com as suas credenciais
const supabaseUrl = 'https://dmbllbcvqgqljegnnhrs.supabase.co'; // URL base sem o /rest/v1/
const supabaseKey = 'sb_publishable_NLHeKZASaezelW9QOY6q-g_ZB5UgBPx';

const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. LÓGICA DA ABA MULTIPLAYER (Adicionar Jogadores)
    // ==========================================
    const playersContainer = document.getElementById('players-container');
    const btnAddPlayer = document.getElementById('btn-add-player');
    
    if (playersContainer && btnAddPlayer) {
        let playerCount = 0;
        const maxPlayers = 4; // Limite oficial de jogadores

        function addPlayerBlock() {
            if (playerCount >= maxPlayers) return;
            playerCount++;
            
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-section';
            playerDiv.innerHTML = `
                <h3>Jogador ${playerCount}</h3>
                <div class="form-group">
                    <label>Nome:</label>
                    <input type="text" class="player-name" placeholder="Nome do Jogador" required>
                </div>
                <div class="grid-2-col">
                    <div class="form-group">
                        <label>Espírito da Natureza:</label>
                        <select class="player-spirit">
                            <option value="Nenhum">Nenhum</option>
                            <option value="Espirito 1">Espirito 1</option>
                            <option value="Espirito 2">Espirito 2</option>
                            <option value="Espirito 3">Espirito 3</option>
                            <option value="Espirito 4">Espirito 4</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Pontos Totais:</label>
                        <input type="number" class="player-score" placeholder="Ex: 85" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Cubos de Animal (Desempate):</label>
                    <input type="number" class="player-cubes" placeholder="Ex: 12" required>
                </div>
            `;
            playersContainer.appendChild(playerDiv);

            if (playerCount >= maxPlayers) {
                btnAddPlayer.style.display = 'none';
            }
        }

        // Inicializa com 2 jogadores
        addPlayerBlock(); 
        addPlayerBlock(); 
        btnAddPlayer.addEventListener('click', addPlayerBlock);
    }

    // ==========================================
    // 2. LÓGICA DE SALVAR PARTIDA SOLO
    // ==========================================
    const soloForm = document.getElementById('solo-form');
    if (soloForm) {
        soloForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = soloForm.querySelector('.btn-submit');
            btnSubmit.innerText = "Salvando no Banco...";
            btnSubmit.disabled = true;

            const nomeJogador = document.getElementById('nome-j1').value;
            const dataPartida = document.getElementById('data-partida').value;
            const lado = document.querySelector('input[name="lado_tabuleiro"]:checked').value;
            const espirito = document.getElementById('espirito-j1').value;
            const pontos = parseInt(document.getElementById('pontos-j1').value);
            const sois = parseInt(document.getElementById('sois-j1').value);

            try {
                // Passo A: Buscar ou criar Jogador
                let { data: jogador } = await supabase.from('jogadores').select('id').eq('nome', nomeJogador).maybeSingle();
                if (!jogador) {
                    const { data: novoJog, error } = await supabase.from('jogadores').insert([{ nome: nomeJogador }]).select().single();
                    if (error) throw error;
                    jogador = novoJog;
                }

                // Passo B: Criar Partida
                const { data: partida, error: errPartida } = await supabase.from('partidas').insert([{ 
                    data_partida: dataPartida, modo_jogo: 'Solo', lado_tabuleiro: lado 
                }]).select().single();
                if (errPartida) throw errPartida;

                // Passo C: Criar Registro
                const { error: errRegistro } = await supabase.from('registros_partida').insert([{
                    partida_id: partida.id,
                    jogador_id: jogador.id,
                    espirito_natureza: espirito,
                    pontos: pontos,
                    cubos_animal: 0, 
                    sois: sois,
                    vencedor: true 
                }]);
                if (errRegistro) throw errRegistro;

                alert("Partida Solo salva com sucesso!");
                window.location.href = "historico.html";

            } catch (error) {
                console.error(error);
                alert("Erro ao salvar: " + error.message);
                btnSubmit.innerText = "Salvar Partida Solo";
                btnSubmit.disabled = false;
            }
        });
    }

    // ==========================================
    // 3. LÓGICA DE SALVAR PARTIDA MULTIPLAYER
    // ==========================================
    const multiForm = document.getElementById('multi-form');
    if (multiForm) {
        multiForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = multiForm.querySelector('.btn-submit');
            btnSubmit.innerText = "Salvando no Banco...";
            btnSubmit.disabled = true;

            const dataPartida = document.getElementById('data-partida-multi').value;
            const lado = document.querySelector('input[name="lado_tabuleiro_multi"]:checked').value;
            
            // Coletar dados da tela
            const sections = document.querySelectorAll('.player-section');
            let jogadoresDados = [];
            
            sections.forEach(section => {
                jogadoresDados.push({
                    nome: section.querySelector('.player-name').value,
                    espirito: section.querySelector('.player-spirit').value,
                    pontos: parseInt(section.querySelector('.player-score').value),
                    cubos: parseInt(section.querySelector('.player-cubes').value)
                });
            });

            // Determinar o Vencedor (Maior Pontuação ou Maior qtde de Cubos em caso de empate)
            let maxPoints = -1;
            let maxCubes = -1;
            let indicesVencedores = [];

            jogadoresDados.forEach((jog, index) => {
                if (jog.pontos > maxPoints) {
                    maxPoints = jog.pontos;
                    maxCubes = jog.cubos;
                    indicesVencedores = [index];
                } else if (jog.pontos === maxPoints) {
                    if (jog.cubos > maxCubes) {
                        maxCubes = jog.cubos;
                        indicesVencedores = [index];
                    } else if (jog.cubos === maxCubes) {
                        indicesVencedores.push(index); // Empate total compartilha vitória
                    }
                }
            });

            try {
                // Passo A: Criar a Partida
                const { data: partida, error: errPartida } = await supabase.from('partidas').insert([{ 
                    data_partida: dataPartida, modo_jogo: 'Grupo', lado_tabuleiro: lado 
                }]).select().single();
                if (errPartida) throw errPartida;

                // Passo B: Processar cada jogador
                for (let i = 0; i < jogadoresDados.length; i++) {
                    let jog = jogadoresDados[i];
                    let isVencedor = indicesVencedores.includes(i);

                    // Buscar ou Criar Jogador
                    let { data: jogador } = await supabase.from('jogadores').select('id').eq('nome', jog.nome).maybeSingle();
                    if (!jogador) {
                        const { data: novoJog, error: errJog } = await supabase.from('jogadores').insert([{ nome: jog.nome }]).select().single();
                        if (errJog) throw errJog;
                        jogador = novoJog;
                    }

                    // Inserir Registro
                    const { error: errRegistro } = await supabase.from('registros_partida').insert([{
                        partida_id: partida.id,
                        jogador_id: jogador.id,
                        espirito_natureza: jog.espirito,
                        pontos: jog.pontos,
                        cubos_animal: jog.cubos,
                        vencedor: isVencedor
                    }]);
                    if (errRegistro) throw errRegistro;
                }

                alert("Partida em Grupo salva com sucesso!");
                window.location.href = "historico.html";

            } catch (error) {
                console.error(error);
                alert("Erro ao salvar: " + error.message);
                btnSubmit.innerText = "Salvar Partida em Grupo";
                btnSubmit.disabled = false;
            }
        });
    }

    // ==========================================
    // 4. LÓGICA DE EXIBIÇÃO NO HISTÓRICO
    // ==========================================
    const historicoContainer = document.getElementById('historico-container');
    if (historicoContainer) {
        async function carregarHistorico() {
            historicoContainer.innerHTML = "<p style='text-align:center;'>Buscando partidas no banco de dados...</p>";
            
            // Faz um Join entre Partidas, Registros e Jogadores usando a sintaxe do Supabase
            const { data: partidas, error } = await supabase
                .from('partidas')
                .select(`
                    id, data_partida, modo_jogo, lado_tabuleiro,
                    registros_partida (
                        pontos, sois, vencedor, espirito_natureza, cubos_animal,
                        jogadores ( nome )
                    )
                `)
                .order('data_partida', { ascending: false });

            if (error) {
                historicoContainer.innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar histórico: ${error.message}</p>`;
                return;
            }

            if (!partidas || partidas.length === 0) {
                historicoContainer.innerHTML = `<p style="text-align:center; color:#666;">Nenhuma partida registrada ainda.</p>`;
                return;
            }

            historicoContainer.innerHTML = ''; // Limpa o carregando

            partidas.forEach(partida => {
                const card = document.createElement('div');
                card.className = 'card';
                let dataFormatada = partida.data_partida.split('-').reverse().join('/');

                let html = `
                    <div class="flex-between" style="border-bottom: 1px solid #ccc; margin-bottom: 10px;">
                        <h3 style="color: var(--primary-color);">Partida ${partida.modo_jogo}</h3>
                        <span>📅 ${dataFormatada} | Lado: <b>${partida.lado_tabuleiro}</b></span>
                    </div>
                `;

                // Ordenar os registros para o vencedor aparecer no topo
                let registros = partida.registros_partida.sort((a, b) => b.pontos - a.pontos);

                registros.forEach(r => {
                    html += `
                        <div style="margin-bottom: 5px; padding: 5px; ${r.vencedor ? 'background-color: #e8f5e9; border-left: 4px solid #2c5e3b;' : ''}">
                            <b>${r.jogadores.nome}</b> ${r.vencedor && partida.modo_jogo !== 'Solo' ? '👑 (Vencedor)' : ''} <br>
                            Pontos: <b>${r.pontos}</b> 
                            | Cubos: ${r.cubos_animal} 
                            | Espírito: ${r.espirito_natureza}
                            ${r.sois ? ` | ⭐ ${r.sois} Sóis` : ''}
                        </div>
                    `;
                });

                card.innerHTML = html;
                historicoContainer.appendChild(card);
            });
        }

        carregarHistorico();
    }
});