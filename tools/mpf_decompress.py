#!/usr/bin/env python3
"""
Byte-exact MPF maze decompressor for The Mad Balloon (Palm OS).

Rather than re-implement the intricate in-place backward LZ77+Huffman scheme by
hand, this executes the ACTUAL 68000 decompressor bytes from code_1.bin via a small
interpreter, then validates each level decodes to exactly its uncompressed size.

Functions executed: 0x38d2 (main), 0x3a10, 0x3a46, 0x3a52, 0x3a6a, 0x3a76.
Calling convention: decompress(a0 = MPF block ptr, a1 = output ptr) -> d0 = usize.
"""
import base64, json, os, struct, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CODE = open(os.path.join(ROOT, 're/resources/code_1.bin'), 'rb').read()

MEM = bytearray(0x400000)
MEM[0:len(CODE)] = CODE
OUT_BASE = 0x100000
STACK_TOP = 0x200000
A5_BASE = 0x300000

M32 = 0xFFFFFFFF

def u32(v): return v & M32
def s8(v):
    v &= 0xFF;  return v - 0x100 if v & 0x80 else v
def s16(v):
    v &= 0xFFFF; return v - 0x10000 if v & 0x8000 else v
def s32(v):
    v &= M32;    return v - 0x100000000 if v & 0x80000000 else v

class CPU:
    def __init__(self):
        self.D = [0]*8
        self.A = [0]*8
        self.pc = 0
        self.N = self.Z = self.V = self.C = self.X = False

    # memory (big-endian)
    def r8(self, a): return MEM[a & M32]
    def r16(self, a): a &= M32; return (MEM[a] << 8) | MEM[a+1]
    def r32(self, a):
        a &= M32; return (MEM[a]<<24)|(MEM[a+1]<<16)|(MEM[a+2]<<8)|MEM[a+3]
    def w8(self, a, v): MEM[a & M32] = v & 0xFF
    def w16(self, a, v):
        a &= M32; MEM[a] = (v>>8)&0xFF; MEM[a+1] = v&0xFF
    def w32(self, a, v):
        a &= M32; v &= M32
        MEM[a]=(v>>24)&0xFF; MEM[a+1]=(v>>16)&0xFF; MEM[a+2]=(v>>8)&0xFF; MEM[a+3]=v&0xFF

    def fetch(self):
        w = self.r16(self.pc); self.pc = u32(self.pc+2); return w

    # set N,Z for a result of given size; clear V,C (logical ops / move)
    def setNZ(self, val, size):
        m = {1:0xFF,2:0xFFFF,4:M32}[size]; val &= m
        self.Z = (val == 0)
        self.N = bool(val & ((m+1)>>1))
        self.V = False; self.C = False

    def sub_flags(self, a, b, size, with_x=True):
        m = {1:0xFF,2:0xFFFF,4:M32}[size]; sb = (m+1)>>1
        a &= m; b &= m; r = (a - b) & m
        self.Z = (r == 0)
        self.N = bool(r & sb)
        sa = bool(a & sb); sbb = bool(b & sb); sr = bool(r & sb)
        self.V = (sa != sbb) and (sr != sa)
        self.C = a < b
        if with_x: self.X = self.C
        return r

    def add_flags(self, a, b, size):
        m = {1:0xFF,2:0xFFFF,4:M32}[size]; sb = (m+1)>>1
        a &= m; b &= m; full = a + b; r = full & m
        self.Z = (r == 0); self.N = bool(r & sb)
        sa = bool(a & sb); sbb = bool(b & sb); sr = bool(r & sb)
        self.V = (sa == sbb) and (sr != sa)
        self.C = full > m; self.X = self.C
        return r

# ---- effective address ------------------------------------------------------
# returns ('D',i) / ('A',i) / ('M',addr) / ('I',value)
def ea(cpu, mode, reg, size):
    if mode == 0: return ('D', reg)
    if mode == 1: return ('A', reg)
    if mode == 2: return ('M', cpu.A[reg] & M32)
    if mode == 3:  # (An)+
        a = cpu.A[reg] & M32
        inc = size if not (reg == 7 and size == 1) else 2
        cpu.A[reg] = u32(cpu.A[reg] + inc); return ('M', a)
    if mode == 4:  # -(An)
        dec = size if not (reg == 7 and size == 1) else 2
        cpu.A[reg] = u32(cpu.A[reg] - dec); return ('M', cpu.A[reg] & M32)
    if mode == 5:  # (d16,An)
        d = s16(cpu.fetch()); return ('M', u32(cpu.A[reg] + d))
    if mode == 6:  # (d8,An,Xn)
        ext = cpu.fetch(); d = s8(ext & 0xFF)
        xi = (ext >> 12) & 7; xa = (ext >> 15) & 1
        xv = (cpu.A[xi] if xa else cpu.D[xi])
        xv = s32(xv) if (ext & 0x0800) else s16(xv & 0xFFFF)
        return ('M', u32(cpu.A[reg] + d + xv))
    if mode == 7:
        if reg == 0: return ('M', u32(s16(cpu.fetch())))      # abs.w
        if reg == 1: return ('M', u32((cpu.fetch()<<16)|cpu.fetch()))  # abs.l
        if reg == 2:  # (d16,PC)
            base = cpu.pc; d = s16(cpu.fetch()); return ('M', u32(base + d))
        if reg == 4:  # immediate
            if size == 1: return ('I', cpu.fetch() & 0xFF)
            if size == 2: return ('I', cpu.fetch() & 0xFFFF)
            return ('I', u32((cpu.fetch()<<16)|cpu.fetch()))
    raise Exception(f'EA mode {mode} reg {reg} @ {cpu.pc:#x}')

def ea_read(cpu, loc, size):
    k, v = loc
    if k == 'D': return cpu.D[v] & {1:0xFF,2:0xFFFF,4:M32}[size]
    if k == 'A': return cpu.A[v] & {1:0xFF,2:0xFFFF,4:M32}[size]
    if k == 'I': return v
    return (cpu.r8(v) if size==1 else cpu.r16(v) if size==2 else cpu.r32(v))

def ea_write(cpu, loc, size, val):
    k, v = loc
    if k == 'D':
        m = {1:0xFF,2:0xFFFF,4:M32}[size]
        cpu.D[v] = (cpu.D[v] & ~m & M32) | (val & m)
    elif k == 'A':
        cpu.A[v] = u32(s16(val) if size==2 else val)  # An writes sign-extend word
    elif k == 'M':
        (cpu.w8 if size==1 else cpu.w16 if size==2 else cpu.w32)(v, val)
    else:
        raise Exception('write to immediate')

SIZES = {0:1,1:2,2:4}  # for move it's different; handled inline

def run(cpu, start, ret_sentinel):
    cpu.pc = start
    steps = 0
    while True:
        steps += 1
        if steps > 50_000_000: raise Exception('runaway')
        op = cpu.fetch()
        top = op >> 12

        # RTS
        if op == 0x4e75:
            ret = cpu.r32(cpu.A[7]); cpu.A[7] = u32(cpu.A[7]+4)
            if ret == ret_sentinel: return
            cpu.pc = ret; continue
        # Branches Bcc / BRA / BSR  (0x6xxx)
        if top == 0x6:
            cc = (op >> 8) & 0xF
            disp8 = op & 0xFF
            base = cpu.pc  # points just past opcode word
            if disp8 == 0x00:
                disp = s16(cpu.fetch())
            elif disp8 == 0xFF:
                disp = s32((cpu.fetch()<<16)|cpu.fetch())
            else:
                disp = s8(disp8)
            target = u32(base + disp)
            if cc == 0x1:  # BSR
                cpu.A[7] = u32(cpu.A[7]-4); cpu.w32(cpu.A[7], cpu.pc)
                cpu.pc = target; continue
            take = branch_cc(cpu, cc)
            if cc == 0x0: take = True  # BRA
            if take: cpu.pc = target
            continue

        # DBcc (0x5xC8.. ) : 0101 cccc 11001 rrr
        if (op & 0xF0F8) == 0x50C8:
            cc = (op >> 8) & 0xF
            reg = op & 7
            disp = s16(cpu.fetch())
            base = cpu.pc - 2  # base is address after the opcode word (disp read advanced pc by 2)
            base = base  # = pc - 2 + 2? handle: branch base = address of displacement word's location's container = (pc-2)
            taken_cond = branch_cc(cpu, cc)
            if not taken_cond:
                lo = (cpu.D[reg] - 1) & 0xFFFF
                cpu.D[reg] = (cpu.D[reg] & ~0xFFFF & M32) | lo
                if lo != 0xFFFF:
                    cpu.pc = u32(base + disp)
            continue

        if handle(cpu, op):
            continue
        raise Exception(f'unimpl opcode {op:#06x} @ pc-2={cpu.pc-2:#x}')

def branch_cc(cpu, cc):
    N,Z,V,C = cpu.N,cpu.Z,cpu.V,cpu.C
    return [True, False, (not C and not Z), (C or Z), (not C), C, (not Z), Z,
            (not V), V, (not N), N, (N==V), (N!=V), (not Z and N==V), (Z or N!=V)][cc]

def handle(cpu, op):
    top = op >> 12

    # MOVE / MOVEA (0001=b,0011=w,0010=l)
    if top in (0x1, 0x2, 0x3):
        size = {0x1:1, 0x3:2, 0x2:4}[top]
        src_mode = (op >> 3) & 7; src_reg = op & 7
        dst_reg = (op >> 9) & 7; dst_mode = (op >> 6) & 7
        sloc = ea(cpu, src_mode, src_reg, size)
        val = ea_read(cpu, sloc, size)
        if dst_mode == 1:  # MOVEA
            cpu.A[dst_reg] = u32(s16(val) if size==2 else s32(val))
            return True
        dloc = ea(cpu, dst_mode, dst_reg, size)
        ea_write(cpu, dloc, size, val)
        cpu.setNZ(val, size)
        return True

    # MOVEQ (0111 rrr 0 dddddddd)
    if (op & 0xF100) == 0x7000:
        reg = (op >> 9) & 7; val = s8(op & 0xFF)
        cpu.D[reg] = u32(val); cpu.setNZ(val, 4); return True

    # LEA (0100 aaa 111 mode reg)
    if (op & 0xF1C0) == 0x41C0:
        areg = (op >> 9) & 7
        loc = ea(cpu, (op>>3)&7, op&7, 4)
        assert loc[0] == 'M'; cpu.A[areg] = u32(loc[1]); return True

    # MOVEM (0100 1d001 s mask) : 0x48xx store, 0x4Cxx load
    if (op & 0xFB80) == 0x4880:
        direction = (op >> 10) & 1  # 0=reg->mem, 1=mem->reg
        size = 4 if (op & 0x40) else 2
        mode = (op >> 3) & 7; reg = op & 7
        mask = cpu.fetch()
        if direction == 0 and mode == 4:  # -(An): order a7..d0
            order = [('A',7-i) for i in range(8)] + [('D',7-i) for i in range(8)]
            for bit,(k,idx) in enumerate(order):
                if mask & (1<<bit):
                    cpu.A[reg] = u32(cpu.A[reg]-size)
                    v = cpu.A[idx] if k=='A' else cpu.D[idx]
                    (cpu.w16 if size==2 else cpu.w32)(cpu.A[reg], v & (0xFFFF if size==2 else M32))
            return True
        # load or store with (An)/(An)+ : order d0..a7
        addr = cpu.A[reg] & M32
        order = [('D',i) for i in range(8)] + [('A',i) for i in range(8)]
        for bit,(k,idx) in enumerate(order):
            if mask & (1<<bit):
                if direction == 1:  # mem->reg
                    v = (cpu.r16(addr) if size==2 else cpu.r32(addr))
                    if size==2: v = u32(s16(v))
                    if k=='A': cpu.A[idx]=u32(v)
                    else: cpu.D[idx]=u32(v)
                else:  # reg->mem (An) or (An)+
                    v = cpu.A[idx] if k=='A' else cpu.D[idx]
                    (cpu.w16 if size==2 else cpu.w32)(addr, v & (0xFFFF if size==2 else M32))
                addr = u32(addr + size)
        if mode == 3: cpu.A[reg] = u32(addr)  # (An)+ writeback
        return True

    # CLR (0100 0010 ss mode reg)
    if (op & 0xFF00) == 0x4200:
        size = SIZES[(op>>6)&3]; loc = ea(cpu,(op>>3)&7,op&7,size)
        ea_write(cpu, loc, size, 0)
        cpu.Z=True; cpu.N=False; cpu.V=False; cpu.C=False; return True

    # TST (0100 1010 ss mode reg)
    if (op & 0xFF00) == 0x4A00:
        size = SIZES[(op>>6)&3]; loc = ea(cpu,(op>>3)&7,op&7,size)
        cpu.setNZ(ea_read(cpu,loc,size), size); return True

    # SWAP (0100100001000 rrr)
    if (op & 0xFFF8) == 0x4840:
        reg = op & 7; v = cpu.D[reg]; v = ((v>>16)|(v<<16)) & M32
        cpu.D[reg]=v; cpu.setNZ(v,4); return True

    # NEG (0100 0100 ss mode reg)
    if (op & 0xFF00) == 0x4400:
        size = SIZES[(op>>6)&3]; loc=ea(cpu,(op>>3)&7,op&7,size)
        v = ea_read(cpu,loc,size); r = cpu.sub_flags(0, v, size); ea_write(cpu,loc,size,r); return True

    # ADDQ / SUBQ (0101 ddd 0/1 ss mode reg)
    if (op & 0xF000) == 0x5000 and ((op>>6)&3) != 3:
        data = (op>>9)&7; data = 8 if data==0 else data
        sub = (op>>8)&1; size = SIZES[(op>>6)&3]
        mode=(op>>3)&7; reg=op&7
        if mode == 1:  # An: no flags, full long add/sub
            cpu.A[reg] = u32(cpu.A[reg] + (-data if sub else data)); return True
        loc=ea(cpu,mode,reg,size); v=ea_read(cpu,loc,size)
        r = cpu.sub_flags(v,data,size) if sub else cpu.add_flags(v,data,size)
        ea_write(cpu,loc,size,r); return True

    # ADDA / SUBA (1101/1001 aaa 1 s1 mode reg)
    if (op & 0xF0C0) == 0xD0C0 or (op & 0xF0C0) == 0x90C0:
        sub = (op>>14)&1==0  # 1001=sub(0x9), 1101=add(0xD)
        areg=(op>>9)&7; size = 4 if (op>>8)&1 else 2
        loc=ea(cpu,(op>>3)&7,op&7,size); v=ea_read(cpu,loc,size)
        v = s32(v) if size==4 else s16(v)
        cpu.A[areg]=u32(cpu.A[areg] + (-v if sub else v)); return True

    # ADD / SUB (1101/1001 ddd opmode mode reg) opmode 0/1/2 = <ea>op Dn->Dn ; 4/5/6 = Dn op <ea>-><ea>
    if (top == 0xD or top == 0x9):
        sub = (top == 0x9)
        dreg=(op>>9)&7; opmode=(op>>6)&7; size=SIZES[opmode&3]
        loc=ea(cpu,(op>>3)&7,op&7,size)
        if opmode < 3:  # <ea> op Dn -> Dn
            a=cpu.D[dreg]; b=ea_read(cpu,loc,size)
            r = cpu.sub_flags(a,b,size) if sub else cpu.add_flags(a,b,size)
            ea_write(cpu,('D',dreg),size,r)
        else:  # Dn op <ea> -> <ea>
            a=ea_read(cpu,loc,size); b=cpu.D[dreg]
            r = cpu.sub_flags(a,b,size) if sub else cpu.add_flags(a,b,size)
            ea_write(cpu,loc,size,r)
        return True

    # CMP / CMPA (1011 ...)
    if top == 0xB:
        opmode=(op>>6)&7; reg=(op>>9)&7
        if opmode in (3,7):  # CMPA (.w=3,.l=7)
            size = 2 if opmode==3 else 4
            loc=ea(cpu,(op>>3)&7,op&7,size); v=ea_read(cpu,loc,size)
            v = s16(v) if size==2 else s32(v)
            cpu.sub_flags(cpu.A[reg], v & M32, 4, with_x=False)
            return True
        if opmode in (0,1,2):  # CMP
            size=SIZES[opmode]; loc=ea(cpu,(op>>3)&7,op&7,size)
            cpu.sub_flags(cpu.D[reg], ea_read(cpu,loc,size), size, with_x=False); return True
        # 4,5,6 = EOR or CMPM; not expected
        if opmode in (4,5,6) and ((op>>3)&7)==1:  # CMPM (An)+,(An)+
            size=SIZES[opmode-4]
            sa=ea(cpu,3,op&7,size); da=ea(cpu,3,reg,size)
            cpu.sub_flags(ea_read(cpu,da,size), ea_read(cpu,sa,size), size, with_x=False); return True

    # CMPI (0000 1100 ss mode reg)
    if (op & 0xFF00) == 0x0C00:
        size=SIZES[(op>>6)&3]
        imm = (cpu.fetch() if size!=4 else ((cpu.fetch()<<16)|cpu.fetch()))
        if size==1: imm &= 0xFF
        loc=ea(cpu,(op>>3)&7,op&7,size)
        cpu.sub_flags(ea_read(cpu,loc,size), imm, size, with_x=False); return True

    # ANDI/ORI immediate (0000 0010=ANDI, 0000 0000=ORI)
    if (op & 0xFF00) in (0x0200, 0x0000) and ((op>>6)&3)!=3:
        size=SIZES[(op>>6)&3]
        imm=(cpu.fetch() if size!=4 else ((cpu.fetch()<<16)|cpu.fetch()))
        if size==1: imm&=0xFF
        loc=ea(cpu,(op>>3)&7,op&7,size); v=ea_read(cpu,loc,size)
        r = (v & imm) if (op & 0xFF00)==0x0200 else (v | imm)
        ea_write(cpu,loc,size,r); cpu.setNZ(r,size); return True

    # AND / OR (1100=AND, 1000=OR)
    if top in (0xC, 0x8):
        opmode=(op>>6)&7
        if opmode in (3,7):  # MULU/MULS or DIVU/DIVS share these; not expected here except maybe
            pass
        else:
            dreg=(op>>9)&7; size=SIZES[opmode&3]; loc=ea(cpu,(op>>3)&7,op&7,size)
            if opmode<3:
                a=cpu.D[dreg]; b=ea_read(cpu,loc,size)
                r=(a&b) if top==0xC else (a|b)
                ea_write(cpu,('D',dreg),size,r); cpu.setNZ(r,size); return True
            else:
                a=ea_read(cpu,loc,size); b=cpu.D[dreg]
                r=(a&b) if top==0xC else (a|b)
                ea_write(cpu,loc,size,r); cpu.setNZ(r,size); return True

    # BTST/BSET/BCLR/BCHG with Dn (0000 ddd 1 tt mode reg)
    if (op & 0xF100) == 0x0100:
        tt=(op>>6)&3; dreg=(op>>9)&7; bit=cpu.D[dreg]
        mode=(op>>3)&7; reg=op&7
        size = 4 if mode==0 else 1
        bit %= (32 if size==4 else 8)
        loc=ea(cpu,mode,reg,size); v=ea_read(cpu,loc,size)
        cpu.Z = ((v>>bit)&1)==0
        if tt==1: v |= (1<<bit)
        elif tt==2: v &= ~(1<<bit)
        elif tt==3: v ^= (1<<bit)
        if tt!=0: ea_write(cpu,loc,size,v)
        return True

    # BTST/BSET etc immediate (0000 1000 tt mode reg)(ext: bit number)
    if (op & 0xFF00) == 0x0800:
        tt=(op>>6)&3; bitnum=cpu.fetch()&0xFF
        mode=(op>>3)&7; reg=op&7; size = 4 if mode==0 else 1
        bit = bitnum % (32 if size==4 else 8)
        loc=ea(cpu,mode,reg,size); v=ea_read(cpu,loc,size)
        cpu.Z = ((v>>bit)&1)==0
        if tt==1: v|=(1<<bit)
        elif tt==2: v&=~(1<<bit)
        elif tt==3: v^=(1<<bit)
        if tt!=0: ea_write(cpu,loc,size,v)
        return True

    # Shift/Rotate register form (1110 ccc d ss i/r tt rrr)
    if top == 0xE:
        if ((op>>6)&3) == 3:
            return False  # memory shift by 1 (not used)
        cnt_field=(op>>9)&7; dr=(op>>8)&1; size=SIZES[(op>>6)&3]
        ir=(op>>5)&1; typ=(op>>3)&3; reg=op&7
        if ir==0:
            count = 8 if cnt_field==0 else cnt_field
        else:
            count = cpu.D[cnt_field] & 63
        bits = {1:8,2:16,4:32}[size]
        m = {1:0xFF,2:0xFFFF,4:M32}[size]
        v = cpu.D[reg] & m
        last_out = cpu.C  # default
        if count == 0:
            cpu.C = False
            if typ in (2,3): cpu.C = cpu.X  # roxl/roxr count0 -> C=X
            cpu.V=False; cpu.setNZ_keepC = None
            # set N,Z only
            cpu.Z=(v==0); cpu.N=bool(v & ((m+1)>>1)); cpu.V=False
            return True
        if typ == 0:  # ASL/LSL (logical/arith left identical for our use)
            for _ in range(count):
                last_out = bool(v & ((m+1)>>1)); v = (v<<1) & m
            cpu.C=last_out; cpu.X=last_out
        elif typ == 1:  # LSR / ASR
            arith = (op & 0x100) == 0 and False
            if dr==0 and ir in (0,1):
                pass
            # determine LSR vs ASR: bit8 dr already used; type distinguishes via op? For LSR/ASR both type=1; ASR has (op bit? ) -> 1110 ... i/r=?, the 'logical' bit is bit3? Actually: type field bits4-3: 00=AS,01=LS,10=ROX,11=RO
            pass
        # Re-decode type properly below
        return shift_rotate(cpu, op, size, count, m, bits)

    return False

def shift_rotate(cpu, op, size, count, m, bits):
    dr=(op>>8)&1; typ=(op>>3)&3; reg=op&7
    v = cpu.D[reg] & m
    msb = (m+1)>>1
    last = False
    if typ == 0:  # ASD (arith) ; for left same as logical
        if dr==1:  # left
            for _ in range(count):
                last = bool(v & msb); v=(v<<1)&m
        else:  # ASR
            sign = v & msb
            for _ in range(count):
                last = bool(v & 1); v=(v>>1)|(sign if sign else 0)
                v &= m
        cpu.C=last; cpu.X=last
    elif typ == 1:  # LSD logical
        if dr==1:
            for _ in range(count):
                last=bool(v&msb); v=(v<<1)&m
        else:
            for _ in range(count):
                last=bool(v&1); v=v>>1
        cpu.C=last; cpu.X=last
    elif typ == 2:  # ROXd (rotate through X)
        x = 1 if cpu.X else 0
        if dr==1:
            for _ in range(count):
                nx=bool(v&msb); v=((v<<1)&m)|x; x=1 if nx else 0; last=nx
        else:
            for _ in range(count):
                nx=bool(v&1); v=(v>>1)|(msb if x else 0); x=1 if nx else 0; last=nx
        cpu.C=last; cpu.X=last
    elif typ == 3:  # ROd (rotate)
        if dr==1:
            for _ in range(count):
                last=bool(v&msb); v=((v<<1)&m)|(1 if last else 0)
        else:
            for _ in range(count):
                last=bool(v&1); v=(v>>1)|(msb if last else 0)
        cpu.C=last  # X unaffected
    cpu.D[reg]=(cpu.D[reg] & ~m & M32)|(v & m)
    cpu.Z=(v==0); cpu.N=bool(v&msb); cpu.V=False
    return True


def decompress(block_addr, usize):
    cpu = CPU()
    cpu.A[7] = STACK_TOP
    cpu.A[5] = A5_BASE
    cpu.A[0] = block_addr
    cpu.A[1] = OUT_BASE
    SENT = 0xDEAD0000
    cpu.A[7] = u32(cpu.A[7]-4); cpu.w32(cpu.A[7], SENT)
    run(cpu, 0x38d2, SENT)
    ret = cpu.D[0]
    return ret, bytes(MEM[OUT_BASE:OUT_BASE+usize])


LEVELS = [  # (mpf_off, usize, height)
    (0x7bb0,8000,200),(0x7ea0,8000,200),(0x81ca,12000,300),(0x856c,12000,300),
    (0x8872,12000,300),(0x8d8e,12000,300),(0x9484,16000,400),(0x9944,16000,400),
    (0xa160,16000,400),(0xa78a,16000,400),
]

def wall_mask(raw, height):
    """The decompressed buffer is 40 bytes/row: bytes [0..20) = low plane (1bpp wall mask,
    MSB=leftmost, 1=wall), bytes [20..40) = shading. Returns the H*20-byte 1bpp mask."""
    out = bytearray(height * 20)
    for y in range(height):
        out[y*20:(y+1)*20] = raw[y*40:y*40+20]
    return bytes(out)

def ascii_preview(mask, height, step=4):
    W = 160
    for y in range(0, height, step):
        line = ''
        for x in range(0, W, 2):
            byte = mask[y*20 + (x>>3)]
            line += '#' if (byte >> (7-(x&7))) & 1 else ' '
        print(line)

if __name__ == '__main__':
    all_ok = True
    for i,(off,usize,h) in enumerate(LEVELS):
        ret, raw = decompress(off, usize)
        ok = (ret == usize) and len(raw) == usize and any(raw)
        all_ok = all_ok and ok
        mask = wall_mask(raw, h)
        density = sum(bin(b).count('1') for b in mask) / (h*160)
        print(f"L{i}: ret={ret} len={len(raw)} expected={usize} {'OK' if ok else 'FAIL'} wallDensity={density:.2f}")
        obj = {"width":160, "height":h, "rowBytes":20, "mask": base64.b64encode(mask).decode('ascii')}
        with open(os.path.join(ROOT, f'src/data/extracted/maze{i}.json'),'w') as f:
            json.dump(obj, f)
    print("\n=== L0 wall mask preview ===")
    _, raw0 = decompress(LEVELS[0][0], LEVELS[0][1])
    ascii_preview(wall_mask(raw0, 200), 200)
    print("\nALL OK" if all_ok else "\nSOME FAILED")
