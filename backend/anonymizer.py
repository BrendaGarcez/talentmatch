import re

def anonimizar_curriculo(texto):
    """
    Substitui dados sensíveis por tags para conformidade com LGPD.
    Retorna o texto mascarado e um dicionário com os dados reais para reidratação.
    """
    texto_anon = texto
    info_removida = {}

    padrao_cpf = r'\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b'
    padrao_rg = r'\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dXx]\b'
    padrao_email = r'[\w\.-]+@[\w\.-]+'
    padrao_telefone = r'(\(?\d{2}\)?\s?\d{4,5}-?\d{4})'
    padrao_url = r'https?://\S+|linkedin\.com/in/\S+|github\.com/\S+|instagram\.com/\S+|facebook\.com/\S+'
    padrao_cep = r'\b\d{5}-\d{3}\b'
    padrao_nascimento = r'\b\d{2}/\d{2}/\d{4}\b'

    emails = re.findall(padrao_email, texto_anon)
    if emails:
        info_removida['email'] = emails[0]
        texto_anon = re.sub(padrao_email, '[EMAIL_PROTEGIDO]', texto_anon)

    telefones = re.findall(padrao_telefone, texto_anon)
    if telefones:
        info_removida['telefone'] = telefones[0]
        texto_anon = re.sub(padrao_telefone, '[TELEFONE_PROTEGIDO]', texto_anon)

    cpfs = re.findall(padrao_cpf, texto_anon)
    if cpfs:
        info_removida['cpf'] = cpfs[0]
        texto_anon = re.sub(padrao_cpf, '[CPF_PROTEGIDO]', texto_anon)

    rgs = re.findall(padrao_rg, texto_anon)
    if rgs:
        info_removida['rg'] = rgs[0]
        texto_anon = re.sub(padrao_rg, '[RG_PROTEGIDO]', texto_anon)

    ceps = re.findall(padrao_cep, texto_anon)
    if ceps:
        info_removida['cep'] = ceps[0]
        texto_anon = re.sub(padrao_cep, '[CEP_PROTEGIDO]', texto_anon)

    datas = re.findall(padrao_nascimento, texto_anon)
    if datas:
        info_removida['data_nascimento'] = datas[0]
        texto_anon = re.sub(padrao_nascimento, '[DATA_PROTEGIDA]', texto_anon)

    urls = re.findall(padrao_url, texto_anon)
    if urls:
        info_removida['url'] = urls[0]
        texto_anon = re.sub(padrao_url, '[URL_PROTEGIDA]', texto_anon)

    linhas = [l.strip() for l in texto.split('\n') if l.strip()]
    if linhas:
        nome_provavel = linhas[0]
        if 2 <= len(nome_provavel.split()) <= 4 and re.match(r'^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$', nome_provavel):
            info_removida['nome_detectado'] = nome_provavel
            texto_anon = texto_anon.replace(nome_provavel, '[CANDIDATO ANONIMIZADO]', 1)

    return texto_anon, info_removida
